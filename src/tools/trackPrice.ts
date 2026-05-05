import { Actor } from 'apify';
import { z } from 'zod';
import { TrackProductPriceInput, TrackProductPriceOutput } from '../schemas.js';
import { fetchShopifyProduct } from '../lib/shopify.js';
import { appendProductHistory, getProductHistory } from '../lib/history.js';

export async function trackProductPrice(
  rawInput: unknown
): Promise<z.infer<typeof TrackProductPriceOutput>> {
  const input = TrackProductPriceInput.parse(rawInput);

  const product = await fetchShopifyProduct(input.product_url);
  const today = new Date().toISOString().slice(0, 10);

  const point = {
    date: today,
    price: product.price_min,
    available: product.available,
  };

  // Read existing history first so we can detect first observation
  const existing = await getProductHistory(input.product_url);
  const isFirst = existing.length === 0;

  // Append today's point (will dedupe on date)
  await appendProductHistory(input.product_url, point);

  // Reload after write
  const history = await getProductHistory(input.product_url);

  const prices = history.map((p) => p.price);
  const lowest30d = prices.length > 0 ? Math.min(...prices) : product.price_min;
  const highest30d = prices.length > 0 ? Math.max(...prices) : product.price_min;

  // Recent drop: compare today against the previous distinct point
  let recentDropPct: number | null = null;
  if (history.length >= 2) {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const prev = sorted[sorted.length - 2];
    if (prev.price > product.price_min) {
      recentDropPct = Math.round(((prev.price - product.price_min) / prev.price) * 100);
    }
  }

  await Actor.charge({ eventName: 'track_call' });

  return {
    title: product.title,
    vendor: product.vendor,
    url: product.url,
    current_price: product.price_min,
    currency: product.currency,
    available: product.available,
    lowest_30d: lowest30d,
    highest_30d: highest30d,
    recent_drop_pct: recentDropPct,
    history,
    is_first_observation: isFirst,
  };
}
