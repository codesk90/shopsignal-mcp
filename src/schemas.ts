import { z } from 'zod';

// ============================================================
// Shared types
// ============================================================

export const VariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  option1: z.string().nullable(),
  option2: z.string().nullable(),
  option3: z.string().nullable(),
  price: z.number(),
  compare_at_price: z.number().nullable(),
  available: z.boolean(),
  sku: z.string().nullable(),
});

export const ProductSchema = z.object({
  handle: z.string(),
  title: z.string(),
  vendor: z.string(),
  product_type: z.string(),
  tags: z.array(z.string()),
  price_min: z.number(),
  price_max: z.number(),
  compare_at_price: z.number().nullable(),
  on_sale: z.boolean(),
  sale_pct: z.number().nullable(),
  currency: z.string(),
  available: z.boolean(),
  url: z.string(),
  images: z.array(z.string()),
  variants: z.array(VariantSchema),
});

export type Product = z.infer<typeof ProductSchema>;
export type Variant = z.infer<typeof VariantSchema>;

// ============================================================
// Tool 1: get_store_snapshot
// ============================================================

export const GetStoreSnapshotInput = z.object({
  url: z
    .string()
    .url()
    .describe('Any DTC store URL. Works on Shopify-powered stores. Example: https://glossier.com'),
  include_variants: z
    .boolean()
    .default(true)
    .describe('Include size/color variants. Recommended for fashion. Default true.'),
  max_products: z
    .number()
    .int()
    .min(10)
    .max(1000)
    .default(250)
    .describe('Cap on number of products returned. Default 250.'),
});

export const GetStoreSnapshotOutput = z.object({
  store_name: z.string(),
  platform: z.enum(['shopify', 'shopify_plus', 'other']),
  product_count: z.number(),
  scraped_at: z.string(),
  products: z.array(ProductSchema),
  error: z.string().optional(),
});

// ============================================================
// Tool 2: track_product_price
// ============================================================

export const TrackProductPriceInput = z.object({
  product_url: z
    .string()
    .url()
    .describe('Specific product URL. Example: https://skims.com/products/fits-everybody-corset-tank'),
});

export const PriceHistoryPointSchema = z.object({
  date: z.string(),
  price: z.number(),
  available: z.boolean(),
});

export const TrackProductPriceOutput = z.object({
  title: z.string(),
  vendor: z.string(),
  url: z.string(),
  current_price: z.number(),
  currency: z.string(),
  available: z.boolean(),
  lowest_30d: z.number(),
  highest_30d: z.number(),
  recent_drop_pct: z.number().nullable(),
  history: z.array(PriceHistoryPointSchema),
  is_first_observation: z.boolean(),
});

// ============================================================
// Tool 3: compare_products_across_brands
// ============================================================

export const CompareProductsInput = z.object({
  query: z
    .string()
    .min(2)
    .describe('Natural-language query. Example: "white slip dress" or "vitamin C serum".'),
  brand_urls: z
    .array(z.string().url())
    .min(2)
    .max(10)
    .describe('2 to 10 DTC store URLs to compare across.'),
  max_per_brand: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Maximum matches per brand. Default 5.'),
  match_method: z
    .enum(['text', 'image', 'hybrid'])
    .default('hybrid')
    .describe('How to identify the same product across brands. Hybrid combines text and image similarity. Default hybrid.'),
});

export const ProductMatchSchema = z.object({
  brand: z.string(),
  product_title: z.string(),
  price: z.number(),
  url: z.string(),
  image: z.string(),
  similarity_score: z.number(),
  in_stock: z.boolean(),
});

export const CompareProductsOutput = z.object({
  query: z.string(),
  brands_searched: z.number(),
  matches: z.array(
    z.object({
      canonical_title: z.string(),
      options: z.array(ProductMatchSchema),
      cheapest_in_stock: z
        .object({
          brand: z.string(),
          price: z.number(),
          url: z.string(),
        })
        .nullable(),
    })
  ),
});

// ============================================================
// Tool 4: detect_drops_and_restocks
// ============================================================

export const DetectDropsInput = z.object({
  url: z
    .string()
    .url()
    .describe('DTC store URL to scan for changes.'),
  days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7)
    .describe('Look-back window in days. Default 7.'),
});

export const DetectDropsOutput = z.object({
  store_name: z.string(),
  window_days: z.number(),
  new_products: z.array(
    z.object({
      title: z.string(),
      price: z.number(),
      url: z.string(),
      first_seen: z.string(),
    })
  ),
  restocked: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      out_since: z.string(),
      back_in_stock: z.string(),
    })
  ),
  price_drops: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      old_price: z.number(),
      new_price: z.number(),
      drop_pct: z.number(),
    })
  ),
  discontinued: z.array(
    z.object({
      title: z.string(),
      last_seen: z.string(),
    })
  ),
  insufficient_history: z.boolean(),
});

// ============================================================
// Tool registry — single source for the MCP server
// ============================================================

export const TOOLS = [
  {
    name: 'get_store_snapshot',
    description:
      'Get the full current product catalog of any DTC fashion/beauty/lifestyle store, including variants, prices, sale flags, and stock status. Works on Shopify-powered stores. Use this for: "what is on sale at X?", "show me all products at Y", or as the first step of a comparison workflow.',
    inputSchema: GetStoreSnapshotInput,
    outputSchema: GetStoreSnapshotOutput,
    chargeEvent: 'snapshot_call',
  },
  {
    name: 'track_product_price',
    description:
      'Get the current price plus 30-day price history for a specific product. Returns the lowest and highest seen prices in the window and any recent drop percentage. Use this for: "is this on sale right now?", "what was the lowest price ever?", or "should I wait for a sale?".',
    inputSchema: TrackProductPriceInput,
    outputSchema: TrackProductPriceOutput,
    chargeEvent: 'track_call',
  },
  {
    name: 'compare_products_across_brands',
    description:
      'Find the same or similar products across 2-10 DTC brands and rank by price. Uses text and image similarity to match across brand-specific names. Use this for: "find me a cheaper alternative", "where is the white slip dress cheapest?", or any cross-brand shopping research.',
    inputSchema: CompareProductsInput,
    outputSchema: CompareProductsOutput,
    chargeEvent: 'compare_call',
  },
  {
    name: 'detect_drops_and_restocks',
    description:
      'Detect new products, restocked items, price drops, and discontinued items at a single store over the last N days. Useful for weekly competitor reviews, drop-watching, and trend monitoring. Use this for: "what did Skims drop this week?" or "what came back in stock at Glossier?".',
    inputSchema: DetectDropsInput,
    outputSchema: DetectDropsOutput,
    chargeEvent: 'drops_call',
  },
] as const;

export type ToolName = (typeof TOOLS)[number]['name'];
