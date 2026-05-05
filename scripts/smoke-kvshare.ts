import { Actor } from 'apify';
import { saveStoreSnapshot, getSnapshotsInRange } from '../src/lib/history.js';
import type { Product } from '../src/schemas.js';

await Actor.init();

const storeEnv = process.env.SHOPSIGNAL_HISTORY_STORE_ID;
console.log(`Store target: ${storeEnv ? `ID=${storeEnv}` : 'name=shopsignal-history (local fallback)'}`);

const testUrl = 'https://smoke-test-store.com';
const testProducts: Product[] = [
  {
    handle: 'smoke-test-product',
    title: 'Smoke Test Product',
    url: `${testUrl}/products/smoke-test-product`,
    vendor: 'SmokeTest',
    product_type: 'Test',
    tags: [],
    price_min: 42,
    price_max: 42,
    compare_at_price: null,
    on_sale: false,
    sale_pct: null,
    currency: 'USD',
    available: true,
    images: [],
    variants: [],
  },
];

console.log('Writing test snapshot...');
await saveStoreSnapshot(testUrl, testProducts);
console.log('Write OK');

const snaps = await getSnapshotsInRange(testUrl, 1);
const pass = snaps.length >= 1 && snaps[snaps.length - 1].products.length === 1;
console.log(`Read back: ${snaps.length} snapshot(s), ${snaps[snaps.length - 1]?.products.length ?? 0} product(s)`);
console.log(`RESULT: ${pass ? 'PASS ✓' : 'FAIL ✗'}`);

await Actor.exit();
