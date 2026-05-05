import axios from 'axios';
import sharp from 'sharp';
import type { Product } from '../schemas.js';

// ============================================================
// Cross-brand product matcher
// ============================================================
//
// Goal: given a query and N candidate products from M brands, identify the
// "same" product across brands so an agent can rank by price.
//
// Strategy:
//   1. Filter each brand's catalog to products matching the query (token overlap).
//   2. Score candidate-pair similarity using a hybrid of:
//      - Text similarity: title token Jaccard
//      - Image similarity: perceptual hash (pHash) Hamming distance
//   3. Cluster candidates with score above threshold; rank within cluster by price.
//
// For v1 we use simple, fast methods. CLIP embeddings can come in v1.2 if
// match quality is bad — but on DTC fashion, title+image similarity is plenty.

// Cross-brand product pairs are pre-filtered by query recall, so the title
// overlap threshold can be permissive — products that share the query term
// category rarely share exact title words across brands.
const TEXT_THRESHOLD = 0.15;       // minimum Jaccard similarity to be a "candidate match"
const IMAGE_THRESHOLD = 12;         // max Hamming distance for image-similarity
const HYBRID_THRESHOLD = 0.25;      // weighted combined threshold
const PHASH_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// ============================================================
// Text similarity
// ============================================================

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'with', 'in', 'on', 'for', 'to', 'of',
  'is', 'are', 'be', 'this', 'that', 'new', 'sale',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function textSimilarity(titleA: string, titleB: string): number {
  return jaccard(tokenize(titleA), tokenize(titleB));
}

// ============================================================
// Query matching — does a product match the user's query?
// ============================================================

export function scoreAgainstQuery(product: Product, query: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.size === 0) return 0;
  const productTokens = tokenize(
    `${product.title} ${product.product_type} ${product.tags.join(' ')}`
  );
  // Query recall: what fraction of query terms appear in the product.
  // Jaccard would penalise products with many tags (1 match / 25 tokens = 0.04),
  // killing all results for short queries. Recall rewards genuine term coverage.
  let intersection = 0;
  for (const t of queryTokens) if (productTokens.has(t)) intersection++;
  return intersection / queryTokens.size;
}

// ============================================================
// Image perceptual hash (16-byte aHash via sharp)
// ============================================================
//
// Average hash, not pHash, for speed. Plenty good for finding "is this the
// same dress on a different model" — we don't need DCT-grade precision.

const phashCache = new Map<string, bigint>();

export async function imageHash(url: string): Promise<bigint | null> {
  if (phashCache.has(url)) return phashCache.get(url)!;
  try {
    const { data } = await axios.get<ArrayBuffer>(url, {
      timeout: PHASH_TIMEOUT_MS,
      responseType: 'arraybuffer',
      maxContentLength: MAX_IMAGE_BYTES,
    });
    const buffer = Buffer.from(data);

    // 8x8 grayscale, average-hash
    const raw = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer();

    let total = 0;
    for (let i = 0; i < raw.length; i += 1) total += raw[i];
    const avg = total / raw.length;

    let hash = 0n;
    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash << 1n) | (raw[i] >= avg ? 1n : 0n);
    }
    phashCache.set(url, hash);
    return hash;
  } catch {
    return null;
  }
}

export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

// ============================================================
// Hybrid match scoring
// ============================================================

export async function hybridSimilarity(
  productA: Product,
  productB: Product
): Promise<number> {
  const text = textSimilarity(productA.title, productB.title);

  // Skip image work if text is hopeless
  if (text < 0.15) return text;

  const imgA = productA.images[0];
  const imgB = productB.images[0];
  if (!imgA || !imgB) return text;

  const [hashA, hashB] = await Promise.all([imageHash(imgA), imageHash(imgB)]);
  if (hashA === null || hashB === null) return text;

  const distance = hammingDistance(hashA, hashB);
  const imageScore = Math.max(0, 1 - distance / 32); // 32 = half of 64 bits

  // Weighted: 60% text + 40% image. Text is more reliable; image breaks ties.
  return text * 0.6 + imageScore * 0.4;
}

// ============================================================
// Cluster candidates across brands
// ============================================================

export interface MatchCluster {
  canonical_title: string;
  members: Array<{ brand: string; product: Product; similarity_score: number }>;
}

export async function clusterAcrossBrands(
  brandResults: Array<{ brand: string; products: Product[] }>,
  matchMethod: 'text' | 'image' | 'hybrid'
): Promise<MatchCluster[]> {
  // Flatten with brand annotation
  const all: Array<{ brand: string; product: Product }> = [];
  for (const { brand, products } of brandResults) {
    for (const product of products) all.push({ brand, product });
  }

  if (all.length === 0) return [];

  const clusters: MatchCluster[] = [];
  const claimed = new Set<number>();

  for (let i = 0; i < all.length; i += 1) {
    if (claimed.has(i)) continue;
    const seed = all[i];
    const cluster: MatchCluster = {
      canonical_title: seed.product.title,
      members: [{ brand: seed.brand, product: seed.product, similarity_score: 1 }],
    };
    claimed.add(i);

    for (let j = i + 1; j < all.length; j += 1) {
      if (claimed.has(j)) continue;
      const candidate = all[j];
      // One representative per brand per cluster
      if (cluster.members.some((m) => m.brand === candidate.brand)) continue;

      let score = 0;
      if (matchMethod === 'text') {
        score = textSimilarity(seed.product.title, candidate.product.title);
        if (score < TEXT_THRESHOLD) continue;
      } else if (matchMethod === 'image') {
        const a = seed.product.images[0];
        const b = candidate.product.images[0];
        if (!a || !b) continue;
        const [ha, hb] = await Promise.all([imageHash(a), imageHash(b)]);
        if (ha === null || hb === null) continue;
        const distance = hammingDistance(ha, hb);
        if (distance > IMAGE_THRESHOLD) continue;
        score = 1 - distance / 32;
      } else {
        score = await hybridSimilarity(seed.product, candidate.product);
        if (score < HYBRID_THRESHOLD) continue;
      }

      cluster.members.push({
        brand: candidate.brand,
        product: candidate.product,
        similarity_score: Math.round(score * 100) / 100,
      });
      claimed.add(j);
    }

    // Only keep clusters with at least 2 brands represented
    if (cluster.members.length >= 2) clusters.push(cluster);
  }

  return clusters;
}
