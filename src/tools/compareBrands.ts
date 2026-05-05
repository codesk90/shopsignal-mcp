import { Actor } from 'apify';
import { z } from 'zod';
import {
  CompareProductsInput,
  CompareProductsOutput,
} from '../schemas.js';
import { fetchShopifyCatalog } from '../lib/shopify.js';
import {
  clusterAcrossBrands,
  scoreAgainstQuery,
} from '../lib/matcher.js';

export async function compareProductsAcrossBrands(
  rawInput: unknown
): Promise<z.infer<typeof CompareProductsOutput>> {
  const input = CompareProductsInput.parse(rawInput);

  // Fetch all brand catalogs in parallel
  const fetched = await Promise.allSettled(
    input.brand_urls.map((url) =>
      fetchShopifyCatalog(url, { maxProducts: 250, includeVariants: false })
    )
  );

  const brandResults = fetched
    .map((result, idx) => {
      if (result.status === 'rejected') {
        console.error(`Brand fetch failed: ${input.brand_urls[idx]}`, result.reason);
        return null;
      }
      // Filter products by query relevance, then take top N per brand
      const scored = result.value.products
        .map((product) => ({
          product,
          relevance: scoreAgainstQuery(product, input.query),
        }))
        .filter((s) => s.relevance > 0.1)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, input.max_per_brand);

      return {
        brand: result.value.store_name,
        products: scored.map((s) => s.product),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (brandResults.length === 0) {
    await Actor.charge({ eventName: 'compare_call' });
    return {
      query: input.query,
      brands_searched: 0,
      matches: [],
    };
  }

  // Cluster across brands
  const clusters = await clusterAcrossBrands(brandResults, input.match_method);

  // Build output
  const matches = clusters.map((cluster) => {
    const options = cluster.members.map((m) => ({
      brand: m.brand,
      product_title: m.product.title,
      price: m.product.price_min,
      url: m.product.url,
      image: m.product.images[0] ?? '',
      similarity_score: m.similarity_score,
      in_stock: m.product.available,
    }));

    options.sort((a, b) => a.price - b.price);

    const inStockOptions = options.filter((o) => o.in_stock);
    const cheapestInStock =
      inStockOptions.length > 0
        ? {
            brand: inStockOptions[0].brand,
            price: inStockOptions[0].price,
            url: inStockOptions[0].url,
          }
        : null;

    return {
      canonical_title: cluster.canonical_title,
      options,
      cheapest_in_stock: cheapestInStock,
    };
  });

  await Actor.charge({ eventName: 'compare_call' });

  return {
    query: input.query,
    brands_searched: brandResults.length,
    matches,
  };
}
