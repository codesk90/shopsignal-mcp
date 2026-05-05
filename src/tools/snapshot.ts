import { Actor } from 'apify';
import { z } from 'zod';
import { GetStoreSnapshotInput, GetStoreSnapshotOutput } from '../schemas.js';
import { fetchShopifyCatalog, normalizeUrl } from '../lib/shopify.js';
import { saveStoreSnapshot } from '../lib/history.js';

export async function getStoreSnapshot(
  rawInput: unknown
): Promise<z.infer<typeof GetStoreSnapshotOutput>> {
  const input = GetStoreSnapshotInput.parse(rawInput);

  const url = normalizeUrl(input.url);

  let result;
  try {
    result = await fetchShopifyCatalog(url, {
      maxProducts: input.max_products,
      includeVariants: input.include_variants,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      store_name: url,
      platform: 'other',
      product_count: 0,
      scraped_at: new Date().toISOString(),
      products: [],
      error: message,
    };
  }

  // Charge only on success
  await Actor.charge({ eventName: 'snapshot_call' });

  // Background-save snapshot for history (don't block response)
  void saveStoreSnapshot(url, result.products).catch((err) =>
    console.error('Failed to save snapshot', err)
  );

  return {
    store_name: result.store_name,
    platform: result.platform,
    product_count: result.products.length,
    scraped_at: new Date().toISOString(),
    products: result.products,
  };
}
