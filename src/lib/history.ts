import { Actor } from 'apify';
import type { Product } from '../schemas.js';

// ============================================================
// Price history backed by Apify Key-Value Store
// ============================================================
//
// Keys are organized hierarchically:
//   product:{host}:{handle}        — append-only price-history array
//   snapshot:{host}:{date}          — one full catalog snapshot per day
//   seen:{host}                     — set of product handles ever seen at store
//
// Each track_product_price call writes today's price-point into the history.
// The daily cron also writes per-store snapshots so detect_drops_and_restocks
// has data even on stores that have never been queried via track_product_price.

const HISTORY_STORE_NAME = 'shopsignal-history';

export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
  available: boolean;
}

export interface DailySnapshot {
  date: string;
  store: string;
  products: Array<{
    handle: string;
    title: string;
    url: string;
    price: number;
    available: boolean;
  }>;
}

let cachedStore: Awaited<ReturnType<typeof Actor.openKeyValueStore>> | null = null;

async function getStore() {
  if (cachedStore) return cachedStore;
  // When SHOPSIGNAL_HISTORY_STORE_ID is set both actors open the same physical
  // store by ID regardless of which actor owns it. Unset = local dev name-based open.
  const storeIdOrName = process.env.SHOPSIGNAL_HISTORY_STORE_ID ?? HISTORY_STORE_NAME;
  const forceCloud = !!process.env.SHOPSIGNAL_HISTORY_STORE_ID;
  cachedStore = await Actor.openKeyValueStore(storeIdOrName, { forceCloud });
  return cachedStore;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function hostFromUrl(url: string): string {
  return new URL(url).host.replace(/^www\./, '');
}

// ============================================================
// Per-product price history
// ============================================================

export async function getProductHistory(
  productUrl: string
): Promise<PricePoint[]> {
  const store = await getStore();
  const host = hostFromUrl(productUrl);
  const handle = productUrl.match(/\/products\/([^/?#]+)/)?.[1] ?? 'unknown';
  const key = `product_${host}_${handle}`;
  const existing = (await store.getValue<PricePoint[]>(key)) ?? [];
  return existing;
}

export async function appendProductHistory(
  productUrl: string,
  point: PricePoint
): Promise<void> {
  const store = await getStore();
  const host = hostFromUrl(productUrl);
  const handle = productUrl.match(/\/products\/([^/?#]+)/)?.[1] ?? 'unknown';
  const key = `product_${host}_${handle}`;
  const existing = (await store.getValue<PricePoint[]>(key)) ?? [];

  // Deduplicate: only one point per date per product
  const filtered = existing.filter((p) => p.date !== point.date);
  filtered.push(point);

  // Keep last 90 days only
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10);
  const trimmed = filtered.filter((p) => p.date >= cutoff);

  await store.setValue(key, trimmed);
}

// ============================================================
// Daily store snapshots — power detect_drops_and_restocks
// ============================================================

export async function saveStoreSnapshot(
  storeUrl: string,
  products: Product[]
): Promise<void> {
  const store = await getStore();
  const host = hostFromUrl(storeUrl);
  const date = today();
  const key = `snapshot_${host}_${date}`;

  const snapshot: DailySnapshot = {
    date,
    store: host,
    products: products.map((p) => ({
      handle: p.handle,
      title: p.title,
      url: p.url,
      price: p.price_min,
      available: p.available,
    })),
  };

  await store.setValue(key, snapshot);
}

export async function getSnapshotsInRange(
  storeUrl: string,
  days: number
): Promise<DailySnapshot[]> {
  const store = await getStore();
  const host = hostFromUrl(storeUrl);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const snapshots: DailySnapshot[] = [];

  // Iterate possible date keys deterministically (cheaper than listKeys for known range)
  for (let i = 0; i <= days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const key = `snapshot_${host}_${date}`;
    const snap = await store.getValue<DailySnapshot>(key);
    if (snap) snapshots.push(snap);
  }

  return snapshots.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// Helpers for diff logic
// ============================================================

export interface DropsDiff {
  newProducts: Array<{ handle: string; title: string; url: string; price: number; first_seen: string }>;
  restocked: Array<{ handle: string; title: string; url: string; out_since: string; back_in_stock: string }>;
  priceDrops: Array<{ handle: string; title: string; url: string; old_price: number; new_price: number; drop_pct: number }>;
  discontinued: Array<{ handle: string; title: string; last_seen: string }>;
  insufficientHistory: boolean;
}

export function diffSnapshots(snapshots: DailySnapshot[]): DropsDiff {
  if (snapshots.length < 2) {
    return {
      newProducts: [],
      restocked: [],
      priceDrops: [],
      discontinued: [],
      insufficientHistory: true,
    };
  }

  const oldest = snapshots[0];
  const newest = snapshots[snapshots.length - 1];

  const oldByHandle = new Map(oldest.products.map((p) => [p.handle, p]));
  const newByHandle = new Map(newest.products.map((p) => [p.handle, p]));

  const newProducts: DropsDiff['newProducts'] = [];
  const restocked: DropsDiff['restocked'] = [];
  const priceDrops: DropsDiff['priceDrops'] = [];
  const discontinued: DropsDiff['discontinued'] = [];

  // New: in newest, not in oldest
  for (const p of newest.products) {
    const old = oldByHandle.get(p.handle);
    if (!old) {
      newProducts.push({
        handle: p.handle,
        title: p.title,
        url: p.url,
        price: p.price,
        first_seen: newest.date,
      });
      continue;
    }
    // Restocked: was unavailable, now available
    if (!old.available && p.available) {
      restocked.push({
        handle: p.handle,
        title: p.title,
        url: p.url,
        out_since: oldest.date,
        back_in_stock: newest.date,
      });
    }
    // Price drop: significant decrease (>5% to filter noise)
    if (old.price > p.price && (old.price - p.price) / old.price >= 0.05) {
      priceDrops.push({
        handle: p.handle,
        title: p.title,
        url: p.url,
        old_price: old.price,
        new_price: p.price,
        drop_pct: Math.round(((old.price - p.price) / old.price) * 100),
      });
    }
  }

  // Discontinued: in oldest, not in newest
  for (const p of oldest.products) {
    if (!newByHandle.has(p.handle)) {
      discontinued.push({
        handle: p.handle,
        title: p.title,
        last_seen: oldest.date,
      });
    }
  }

  return {
    newProducts,
    restocked,
    priceDrops,
    discontinued,
    insufficientHistory: false,
  };
}
