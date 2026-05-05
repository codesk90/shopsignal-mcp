// Health-check every URL in SEED_STORES.md by calling detectPlatform().
// Buckets results into confirmed_shopify / non_shopify / errored.
// Run with: npm run healthcheck

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPlatform } from '../src/lib/shopify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '..', 'SEED_STORES.md');
const fullMd = readFileSync(seedPath, 'utf-8');

// Only parse the middle section between the two `---` horizontal rules — that's
// the tier-list region. Falls back to the full file if delimiters not found.
// Without this, prose in the Notes section (which references domains like
// "drunkelephant.com migrated to SFCC") gets pulled in as a false positive.
const sections = fullMd.split(/^---\s*$/m);
const md = sections.length >= 3 ? sections[1] : fullMd;

// Domain-shaped tokens: Unicode letters/digits/hyphens, at least one dot,
// must end in an all-letter TLD (≥2 chars). Excludes file extensions that
// otherwise pass the TLD shape (e.g. `products.json` from prose like
// "<storefront>/products.json").
const tokenRe = /[\p{L}0-9][\p{L}0-9-]*(?:\.[\p{L}0-9-]+)+/gu;
const FILE_EXT_RE =
  /\.(json|md|txt|html?|jsx?|tsx?|css|scss|less|png|jpe?g|gif|webp|svg|pdf|xml|ya?ml|csv|zip|tar|gz|sql|sh|env|toml|lock|map|woff2?)$/i;
const raw = md.match(tokenRe) ?? [];
const domains = [...new Set(
  raw
    .map((s) => s.toLowerCase())
    .filter((s) => /\.[a-z]{2,}$/.test(s))
    .filter((s) => !FILE_EXT_RE.test(s))
    .filter((s) => !s.includes('/'))
)];

console.log(`Probing ${domains.length} unique domains from SEED_STORES.md\n`);

const confirmedShopify: string[] = [];
const nonShopify: string[] = [];
const errored: Array<{ domain: string; error: string }> = [];

const CONCURRENCY = 12;
let cursor = 0;

async function worker() {
  while (cursor < domains.length) {
    const idx = cursor++;
    const domain = domains[idx];
    const url = `https://${domain}`;
    try {
      const platform = await detectPlatform(url);
      if (platform === 'shopify' || platform === 'shopify_plus') {
        confirmedShopify.push(domain);
        process.stdout.write('.');
      } else {
        nonShopify.push(domain);
        process.stdout.write('x');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      errored.push({ domain, error: msg });
      process.stdout.write('!');
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log('\n');
console.log(`=== Confirmed Shopify (${confirmedShopify.length}) ===`);
confirmedShopify.sort().forEach((d) => console.log(d));
console.log(`\n=== Non-Shopify (${nonShopify.length}) ===`);
nonShopify.sort().forEach((d) => console.log(d));
console.log(`\n=== Errored (${errored.length}) ===`);
errored
  .sort((a, b) => a.domain.localeCompare(b.domain))
  .forEach((e) => console.log(`${e.domain} — ${e.error}`));

console.log(
  `\nSummary: ${confirmedShopify.length} shopify · ${nonShopify.length} non-shopify · ${errored.length} errored · ${domains.length} total`
);
