// Local smoke test — run with `npm run smoke`.
// Exercises each tool against real DTC stores. Requires APIFY_TOKEN unset
// (so Actor.charge() noops locally).

import 'dotenv/config';
import { fetchShopifyCatalog, detectPlatform } from '../src/lib/shopify.js';

const STORES = [
  'https://glossier.com',
  'https://allbirds.com',
  'https://kith.com',
  'https://skims.com',
  'https://cuyana.com',
];

async function main() {
  console.log('--- Platform detection ---');
  for (const url of STORES) {
    const platform = await detectPlatform(url);
    console.log(`${url.padEnd(35)} ${platform}`);
  }

  console.log('\n--- Snapshot test (Glossier) ---');
  const result = await fetchShopifyCatalog('https://glossier.com', {
    maxProducts: 10,
  });
  console.log(`Store: ${result.store_name}`);
  console.log(`Platform: ${result.platform}`);
  console.log(`Products: ${result.products.length}`);
  console.log(`First product: ${result.products[0]?.title} — $${result.products[0]?.price_min}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
