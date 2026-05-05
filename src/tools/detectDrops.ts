import { Actor } from 'apify';
import { z } from 'zod';
import { DetectDropsInput, DetectDropsOutput } from '../schemas.js';
import { fetchShopifyCatalog, normalizeUrl } from '../lib/shopify.js';
import {
  diffSnapshots,
  getSnapshotsInRange,
  saveStoreSnapshot,
} from '../lib/history.js';

export async function detectDropsAndRestocks(
  rawInput: unknown
): Promise<z.infer<typeof DetectDropsOutput>> {
  const input = DetectDropsInput.parse(rawInput);
  const url = normalizeUrl(input.url);

  // 1. Always refresh today's snapshot before diffing
  const fresh = await fetchShopifyCatalog(url, {
    maxProducts: 1000,
    includeVariants: false,
  });
  await saveStoreSnapshot(url, fresh.products);

  // 2. Pull historical snapshots in range
  const snapshots = await getSnapshotsInRange(url, input.days);

  // 3. Diff oldest vs newest
  const diff = diffSnapshots(snapshots);

  await Actor.charge({ eventName: 'drops_call' });

  return {
    store_name: fresh.store_name,
    window_days: input.days,
    new_products: diff.newProducts.map((p) => ({
      title: p.title,
      price: p.price,
      url: p.url,
      first_seen: p.first_seen,
    })),
    restocked: diff.restocked.map((p) => ({
      title: p.title,
      url: p.url,
      out_since: p.out_since,
      back_in_stock: p.back_in_stock,
    })),
    price_drops: diff.priceDrops.map((p) => ({
      title: p.title,
      url: p.url,
      old_price: p.old_price,
      new_price: p.new_price,
      drop_pct: p.drop_pct,
    })),
    discontinued: diff.discontinued.map((p) => ({
      title: p.title,
      last_seen: p.last_seen,
    })),
    insufficient_history: diff.insufficientHistory,
  };
}
