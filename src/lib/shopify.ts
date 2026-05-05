import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { Actor } from 'apify';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Product, Variant } from '../schemas.js';

// ============================================================
// Shopify /products.json scraper
// ============================================================
//
// Every Shopify store exposes /products.json publicly (paginated, 250/page).
// This is a documented, stable endpoint — the same one Shopify's own apps use.
// No proxy rotation required for v1. Apify's residential proxies kick in only
// if a store has aggressively rate-limited their public endpoint.
//
// Reference: https://shopify.dev/docs/api/ajax/reference/product

const PRODUCTS_PER_PAGE = 250; // Shopify hard cap
const MAX_PAGES = 4; // 1000 products max per snapshot — covers ~99% of DTC catalogs
const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; ShopSignal/0.1; +https://apify.com/codek/shopsignal-mcp)';
// Realistic Chrome/macOS UA used only for platform detection — Cloudflare and
// other bot challenges block the honest ShopSignal UA on protected stores.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SHOPIFY_SCORE_THRESHOLD = 3;

export interface RawShopifyVariant {
  id: number;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  sku: string | null;
}

export interface RawShopifyImage {
  src: string;
  position: number;
}

export interface RawShopifyProduct {
  id: number;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: RawShopifyVariant[];
  images: RawShopifyImage[];
  published_at: string;
  updated_at: string;
}

export type ShopifyPlatform = 'shopify' | 'shopify_plus' | 'other';

// ============================================================
// Detect platform — score-based, multi-signal
// ============================================================
//
// Signals worth N points each. ≥3 total = shopify. Rationale: any single
// strong signal (`/products.json`, X-Shopify-Stage header, checkout meta tag)
// is sufficient on its own, but two weak signals combine to clear the bar.
// Headless / Hydrogen storefronts hide the meta tag but leak `/cdn/shop/`
// asset paths and `Shopify.routes` JS globals, so those are first-class signals.
// Cloudflare-protected stores get a single proxy retry through Apify
// residential when an APIFY_TOKEN/APIFY_PROXY_PASSWORD is available.

interface Signal {
  name: string;
  weight: number;
  plus?: boolean;
}

function dlog(...args: unknown[]): void {
  if (process.env.SHOPSIGNAL_VERBOSE === '1') {
    console.error('[detect]', ...args);
  }
}

let cachedProxyAgent: HttpsProxyAgent<string> | null | undefined;

async function getProxyAgent(): Promise<HttpsProxyAgent<string> | null> {
  if (cachedProxyAgent !== undefined) return cachedProxyAgent;

  // Fast path: APIFY_PROXY_PASSWORD is auto-injected inside actors and lets
  // us build the proxy URL without an SDK round-trip.
  const proxyPassword = process.env.APIFY_PROXY_PASSWORD;
  if (proxyPassword) {
    const url = `http://groups-RESIDENTIAL:${proxyPassword}@proxy.apify.com:8000`;
    cachedProxyAgent = new HttpsProxyAgent(url);
    return cachedProxyAgent;
  }

  // Fallback: SDK path (requires APIFY_TOKEN).
  if (!process.env.APIFY_TOKEN) {
    cachedProxyAgent = null;
    return null;
  }
  try {
    const config = await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] });
    if (!config) {
      cachedProxyAgent = null;
      return null;
    }
    const url = await config.newUrl();
    if (!url) {
      cachedProxyAgent = null;
      return null;
    }
    cachedProxyAgent = new HttpsProxyAgent(url);
    return cachedProxyAgent;
  } catch {
    cachedProxyAgent = null;
    return null;
  }
}

function looksLikeChallenge(status: number, body: string | undefined): boolean {
  if (status !== 403 && status !== 503 && status !== 429) return false;
  if (!body) return true;
  return (
    body.includes('cf-browser-verification') ||
    body.includes('Just a moment') ||
    body.includes('cf-mitigated') ||
    body.includes('Attention Required! | Cloudflare') ||
    body.includes('Checking your browser') ||
    body.includes('cf-chl-')
  );
}

interface FetchResult {
  status: number;
  html?: string;
  headers: Record<string, string | string[] | undefined>;
}

async function fetchPageHtml(targetUrl: string, useProxy: boolean): Promise<FetchResult> {
  const config: AxiosRequestConfig = {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    maxRedirects: 5,
    validateStatus: () => true,
    responseType: 'text',
  };
  if (useProxy) {
    const agent = await getProxyAgent();
    if (agent) {
      config.httpsAgent = agent;
      config.httpAgent = agent;
      config.proxy = false;
    }
  }
  try {
    const response = await axios.get<string>(targetUrl, config);
    return {
      status: response.status,
      html: typeof response.data === 'string' ? response.data : undefined,
      headers: response.headers as Record<string, string | string[] | undefined>,
    };
  } catch (err) {
    const ax = err as AxiosError;
    return {
      status: ax.response?.status ?? 0,
      html: typeof ax.response?.data === 'string' ? ax.response.data : undefined,
      headers: (ax.response?.headers ?? {}) as Record<string, string | string[] | undefined>,
    };
  }
}

function htmlSignals(html: string): Signal[] {
  const signals: Signal[] = [];
  if (/<meta[^>]+name=["']shopify-checkout-api-token["']/i.test(html)) {
    signals.push({ name: 'meta-checkout-token', weight: 5 });
  }
  if (/cdn\.shopify\.com|cdn\.shopifycdn\.net/i.test(html)) {
    signals.push({ name: 'cdn-shopify', weight: 3 });
  }
  if (/cdn\.shopifyplus\.com/i.test(html)) {
    signals.push({ name: 'cdn-shopifyplus', weight: 3, plus: true });
  }
  if (/window\.Shopify\s*=|Shopify\.shop\s*=|Shopify\.theme\s*=|Shopify\.routes/.test(html)) {
    signals.push({ name: 'shopify-js-globals', weight: 3 });
  }
  if (/monorail-edge\.shopifysvc\.com/i.test(html)) {
    signals.push({ name: 'shopify-analytics', weight: 2 });
  }
  if (/\/cdn\/shop\//i.test(html)) {
    signals.push({ name: 'cdn-shop-path', weight: 3 });
  }
  return signals;
}

function headerSignals(
  headers: Record<string, string | string[] | undefined>
): Signal[] {
  const signals: Signal[] = [];
  const get = (k: string): string | undefined => {
    const v = headers[k.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
  const stage = get('x-shopify-stage');
  if (stage) {
    signals.push({
      name: 'header-x-shopify-stage',
      weight: 5,
      plus: stage === 'production_plus',
    });
  }
  if (get('x-shopid') || get('x-shop-id')) {
    signals.push({ name: 'header-x-shopid', weight: 5 });
  }
  if (get('x-sorting-hat-shopid') || get('x-sorting-hat-podid')) {
    signals.push({ name: 'header-sorting-hat', weight: 5 });
  }
  const poweredBy = get('powered-by');
  if (poweredBy && poweredBy.toLowerCase().includes('shopify')) {
    signals.push({ name: 'header-powered-by', weight: 3 });
  }
  return signals;
}

async function probeProductsJson(baseUrl: string): Promise<Signal | null> {
  try {
    const { status, data } = await axios.get(`${baseUrl}/products.json?limit=1`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      validateStatus: () => true,
    });
    if (
      status === 200 &&
      data &&
      typeof data === 'object' &&
      Array.isArray((data as { products?: unknown[] }).products)
    ) {
      return { name: 'products-json-200', weight: 5 };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function probeCartJs(baseUrl: string): Promise<Signal | null> {
  try {
    const { status, data } = await axios.get(`${baseUrl}/cart.js`, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      validateStatus: () => true,
    });
    if (
      status === 200 &&
      data &&
      typeof data === 'object' &&
      'token' in data &&
      'items' in data
    ) {
      return { name: 'cart-js-200', weight: 3 };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function detectPlatform(rawUrl: string): Promise<ShopifyPlatform> {
  const url = normalizeUrl(rawUrl);
  dlog(url, 'initial GET');

  let result = await fetchPageHtml(url, false);
  const challenged = looksLikeChallenge(result.status, result.html);
  dlog(
    url,
    `initial → status=${result.status}`,
    challenged ? '(cloudflare challenge detected)' : ''
  );

  if (challenged) {
    const agent = await getProxyAgent();
    if (!agent) {
      dlog(url, 'proxy retry SKIPPED (no APIFY_PROXY_PASSWORD or APIFY_TOKEN)');
    } else {
      dlog(url, 'proxy retry triggered (Apify residential)');
      const retry = await fetchPageHtml(url, true);
      dlog(url, `proxy retry → status=${retry.status}`);
      if (retry.status === 200 && retry.html) {
        result = retry;
      }
    }
  }

  const signals: Signal[] = [];
  if (result.html) signals.push(...htmlSignals(result.html));
  signals.push(...headerSignals(result.headers));

  const earlyScore = signals.reduce((sum, s) => sum + s.weight, 0);

  if (earlyScore < SHOPIFY_SCORE_THRESHOLD) {
    dlog(url, `early score=${earlyScore} below threshold; probing /products.json + /cart.js`);
    const [pj, cart] = await Promise.all([probeProductsJson(url), probeCartJs(url)]);
    if (pj) signals.push(pj);
    if (cart) signals.push(cart);
  }

  const finalScore = signals.reduce((sum, s) => sum + s.weight, 0);
  const platform: ShopifyPlatform =
    finalScore < SHOPIFY_SCORE_THRESHOLD
      ? 'other'
      : signals.some((s) => s.plus)
        ? 'shopify_plus'
        : 'shopify';

  dlog(
    url,
    `classified as ${platform}`,
    `(score=${finalScore}, signals=[${signals.map((s) => s.name).join(',') || 'none'}])`
  );

  return platform;
}

// ============================================================
// Fetch full catalog
// ============================================================

export interface ShopifySnapshotResult {
  store_name: string;
  platform: ShopifyPlatform;
  products: Product[];
  raw_count: number;
  truncated: boolean;
}

export async function fetchShopifyCatalog(
  rawUrl: string,
  options: { maxProducts?: number; includeVariants?: boolean } = {}
): Promise<ShopifySnapshotResult> {
  const { maxProducts = 250, includeVariants = true } = options;
  const url = normalizeUrl(rawUrl);

  const platform = await detectPlatform(url);
  if (platform === 'other') {
    throw new Error(
      `${url} is not a Shopify store. Non-Shopify support is on the v2 roadmap.`
    );
  }

  const storeName = await extractStoreName(url);
  const collected: RawShopifyProduct[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    if (collected.length >= maxProducts) break;

    const products = await fetchProductsPage(url, page);
    if (products.length === 0) break;

    collected.push(...products);
    if (products.length < PRODUCTS_PER_PAGE) break;
  }

  const truncated = collected.length > maxProducts;
  const sliced = collected.slice(0, maxProducts);
  const normalized = sliced.map((raw) => normalizeProduct(raw, url, includeVariants));

  return {
    store_name: storeName,
    platform,
    products: normalized,
    raw_count: collected.length,
    truncated,
  };
}

async function fetchProductsPage(
  baseUrl: string,
  page: number
): Promise<RawShopifyProduct[]> {
  const endpoint = `${baseUrl}/products.json?limit=${PRODUCTS_PER_PAGE}&page=${page}`;
  try {
    const { data } = await axios.get<{ products: RawShopifyProduct[] }>(endpoint, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    return data?.products ?? [];
  } catch (err) {
    const ax = err as AxiosError;
    if (ax.response?.status === 429) {
      throw new Error(`Rate limited by ${baseUrl}. Try again with proxy rotation.`);
    }
    throw new Error(`Failed to fetch ${endpoint}: ${ax.message}`);
  }
}

async function extractStoreName(url: string): Promise<string> {
  try {
    const { data: html } = await axios.get<string>(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    const $ = cheerio.load(html);
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    if (ogSiteName) return ogSiteName.trim();

    const title = $('title').text();
    if (title) {
      // Strip common suffixes: "| Glossier", "- Skims", etc.
      return title.split(/[|–—-]/)[0].trim();
    }
  } catch {
    // fall through
  }
  // Fallback: extract from hostname
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0];
}

// ============================================================
// Normalize Shopify raw product → ShopSignal Product
// ============================================================

export function normalizeProduct(
  raw: RawShopifyProduct,
  storeUrl: string,
  includeVariants: boolean
): Product {
  const variants: Variant[] = (raw.variants ?? []).map((v) => ({
    id: String(v.id),
    title: v.title,
    option1: v.option1,
    option2: v.option2,
    option3: v.option3,
    price: parseFloat(v.price),
    compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
    available: v.available,
    sku: v.sku,
  }));

  const prices = variants.map((v) => v.price).filter((p) => !isNaN(p));
  const compareAts = variants
    .map((v) => v.compare_at_price)
    .filter((p): p is number => p !== null && !isNaN(p));

  const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
  const priceMax = prices.length > 0 ? Math.max(...prices) : 0;
  const compareAt = compareAts.length > 0 ? Math.max(...compareAts) : null;

  const onSale = compareAt !== null && compareAt > priceMin;
  const salePct = onSale && compareAt ? Math.round(((compareAt - priceMin) / compareAt) * 100) : null;

  const available = variants.some((v) => v.available);
  const currency = 'USD'; // /products.json doesn't expose currency; default for v1

  return {
    handle: raw.handle,
    title: raw.title,
    vendor: raw.vendor,
    product_type: raw.product_type,
    tags: raw.tags ?? [],
    price_min: priceMin,
    price_max: priceMax,
    compare_at_price: compareAt,
    on_sale: onSale,
    sale_pct: salePct,
    currency,
    available,
    url: `${storeUrl}/products/${raw.handle}`,
    images: (raw.images ?? [])
      .sort((a, b) => a.position - b.position)
      .map((img) => img.src),
    variants: includeVariants ? variants : [],
  };
}

// ============================================================
// URL normalization
// ============================================================

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  // Strip trailing slash and any path/query
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}

// ============================================================
// Single-product fetch (for track_product_price)
// ============================================================

export async function fetchShopifyProduct(productUrl: string): Promise<Product> {
  const u = new URL(productUrl);
  const storeUrl = `${u.protocol}//${u.host}`;
  const handleMatch = u.pathname.match(/\/products\/([^/?#]+)/);
  if (!handleMatch) {
    throw new Error(`URL does not look like a Shopify product page: ${productUrl}`);
  }
  const handle = handleMatch[1];

  // Shopify exposes single-product JSON at /products/{handle}.json
  const endpoint = `${storeUrl}/products/${handle}.json`;
  const { data } = await axios.get<{ product: RawShopifyProduct }>(endpoint, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!data?.product) {
    throw new Error(`Product not found: ${productUrl}`);
  }
  return normalizeProduct(data.product, storeUrl, true);
}
