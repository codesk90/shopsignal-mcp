// Verify the Cloudflare-challenge → Apify proxy retry path.
// Run: npm run verify-proxy [-- <url> ...]
// Defaults to aritzia/drunkelephant/saie if no URLs passed.
// Reads APIFY_PROXY_PASSWORD or APIFY_TOKEN from .env.

import 'dotenv/config';

// Force verbose logging in detectPlatform regardless of caller env.
process.env.SHOPSIGNAL_VERBOSE = '1';

const { detectPlatform } = await import('../src/lib/shopify.js');

const DEFAULT_URLS = [
  'https://aritzia.com',
  'https://drunkelephant.com',
  'https://saie.com',
];

const urls = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_URLS;

const proxyCred =
  process.env.APIFY_PROXY_PASSWORD
    ? 'APIFY_PROXY_PASSWORD set'
    : process.env.APIFY_TOKEN
      ? 'APIFY_TOKEN set (SDK path)'
      : 'NEITHER set — proxy retry will be skipped';

console.log('=== Proxy retry verification ===');
console.log(`Credentials: ${proxyCred}`);
console.log(`URLs: ${urls.length}\n`);

for (const url of urls) {
  console.log(`\n--- ${url} ---`);
  try {
    const platform = await detectPlatform(url);
    console.log(`RESULT: ${platform}`);
  } catch (err) {
    console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
}
