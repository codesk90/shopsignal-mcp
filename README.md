# ShopSignal — DTC competitor intelligence for AI agents

> Give Claude, Cursor, ChatGPT, or any MCP-compatible agent live eyes on any DTC fashion / beauty / lifestyle brand's catalog, prices, and drops — in one tool call.

[![Apify Actor](https://apify.com/badges/actor.svg)](https://apify.com/kodek/shopsignal-mcp)
![MCP](https://img.shields.io/badge/MCP-Streamable_HTTP-blue)
![Pricing](https://img.shields.io/badge/pricing-pay--per--call-green)

---

## What it does

ShopSignal exposes 4 tools to any MCP-compatible AI agent. Drop it into Claude Desktop, Cursor, n8n, or your own LangGraph agent and ask things like:

> *"What's currently on sale at Glossier?"*
> *"Compare prices at Cuyana, Tibi, and Toteme for a slip dress."*
> *"What new products dropped at Glossier and Rhode this week?"*
> *"Track this Cuyana dress and tell me when it goes on sale: [URL]"*

No scraping setup. No API keys. No selectors to maintain. The agent reads the tool schemas and just calls them.

## Quick start (60 seconds)

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "shopsignal": {
      "url": "https://mcp.apify.com?actors=kodek/shopsignal-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_APIFY_TOKEN"
      }
    }
  }
}
```

Restart Claude Desktop. Ask: *"Use ShopSignal to compare prices at glossier.com and rhodeskin.com for vitamin C serum."*

### Cursor

Settings → Tools and MCP → New MCP server → paste the URL above.

### Custom agents (LangGraph, CrewAI, n8n, Mastra)

Standard Streamable HTTP MCP transport at `https://mcp.apify.com`. See [Apify MCP docs](https://docs.apify.com/platform/integrations/mcp).

---

## Tools

### `get_store_snapshot`
**$0.05/call** · Returns full catalog with prices, variants, stock for any DTC store.

```jsonc
// Input
{ "url": "https://glossier.com" }

// Output (truncated)
{
  "store_name": "Glossier",
  "platform": "shopify",
  "product_count": 142,
  "scraped_at": "2026-05-04T18:22:00Z",
  "products": [
    {
      "handle": "balm-dotcom",
      "title": "Balm Dotcom",
      "vendor": "Glossier",
      "price_min": 14, "price_max": 14, "currency": "USD",
      "compare_at_price": null, "on_sale": false,
      "available": true,
      "images": ["https://..."],
      "variants": [
        { "title": "Original", "option1": "Original", "price": 14, "available": true },
        { "title": "Birthday", "option1": "Birthday", "price": 14, "available": false }
      ]
    }
  ]
}
```

### `track_product_price`
**$0.05/call** · Returns current price + 30-day history + lowest/highest seen.

```jsonc
// Input
{ "product_url": "https://cuyana.com/products/classic-easy-tote" }

// Output
{
  "title": "Classic Easy Tote",
  "current_price": 195, "currency": "USD",
  "available": true,
  "lowest_30d": 156, "highest_30d": 195,
  "recent_drop_pct": null,
  "history": [
    { "date": "2026-04-04", "price": 195, "available": true },
    { "date": "2026-04-15", "price": 156, "available": true },
    { "date": "2026-04-22", "price": 195, "available": true }
  ]
}
```

### `compare_products_across_brands`  ⭐ premium
**$0.50/call** · The killer tool. Finds matching products across multiple brands using text + image similarity. Replaces 30+ minutes of manual comparison.

```jsonc
// Input
{
  "query": "white slip dress",
  "brand_urls": ["https://faithfullthebrand.com", "https://staudclothing.com", "https://cuyana.com"],
  "max_per_brand": 3
}

// Output
{
  "query": "white slip dress",
  "brands_searched": 3,
  "matches": [
    {
      "canonical_title": "White satin slip midi dress",
      "options": [
        { "brand": "Faithfull the Brand", "price": 198, "url": "...", "similarity_score": 0.92, "in_stock": true },
        { "brand": "Staud", "price": 345, "url": "...", "similarity_score": 0.85, "in_stock": true },
        { "brand": "Cuyana", "price": 295, "url": "...", "similarity_score": 0.81, "in_stock": false }
      ],
      "cheapest_in_stock": { "brand": "Faithfull the Brand", "price": 198, "url": "..." }
    }
  ]
}
```

### `detect_drops_and_restocks`
**$0.20/call** · Returns new products, restocks, price drops, and discontinued items in the last N days.

```jsonc
// Input
{ "url": "https://cuyana.com", "days": 7 }

// Output
{
  "new_products": [{ "title": "...", "price": 78, "url": "..." }],
  "restocked": [{ "title": "...", "url": "...", "out_since": "2026-04-12" }],
  "price_drops": [{ "title": "...", "old_price": 88, "new_price": 64, "drop_pct": 27 }],
  "discontinued": [{ "title": "...", "last_seen": "2026-04-28" }]
}
```

---

## Pricing

| Tool | Price per call | What it replaces |
|---|---|---|
| `get_store_snapshot` | $0.05 | ~5 min manual browsing |
| `track_product_price` | $0.05 | ~2 min checking + spreadsheet update |
| `compare_products_across_brands` | $0.50 | ~30 min cross-brand research |
| `detect_drops_and_restocks` | $0.20 | ~15 min weekly competitor review |

**No subscriptions. No monthly minimums.** You pay only when the call succeeds. Failed calls (non-Shopify stores, network errors) are not charged. Test on a single store before scaling — most users get a feel for the value within 5–10 calls.

Apify handles billing, taxes, and invoicing. You only pay for successful calls.

---

## Coverage

✅ **Currently supports:** 84 verified Shopify-powered DTC brands across fashion, beauty, and lifestyle. Featured brands include:

- **Beauty:** Glossier, Rhode, Supergoop, Sol de Janeiro, Kosas, Merit, Tower 28
- **Women's fashion:** Skims, Everlane, Cuyana, Mejuri, Tibi, ThirdLove
- **Men's fashion:** Kith, Taylor Stitch, Buck Mason, Aimé Leon Dore
- **Lifestyle / home:** Allbirds, Our Place, Stanley, Therabody, Vuori, Brooklinen

Full seed list of 84 brands is snapshotted daily, so price history is available from day one.

❌ **Does NOT currently support:**
- Stores using enterprise bot protection (Cloudflare Bot Fight, Akamai Bot Manager) — Aritzia, Lululemon, J.Crew, Rhone, and similar require browser-fingerprint scraping (v2 roadmap).
- Brands that have migrated off Shopify to Salesforce Commerce Cloud, Magento, or custom builds — Reformation, Drunk Elephant, Anthropologie, Free People, and similar enterprise DTC brands.
- Marketplaces (Amazon, eBay, REVOLVE, SSENSE, MR PORTER, Net-a-Porter) — different scrapers needed.
- Stores requiring authentication.
- Some Shopify Plus stores restrict their public `/products.json` endpoint (Skims is one example). These pass platform detection but return empty or partial catalogs. We'll document the specific stores affected as users surface them.
- A small number of seed-list brands currently return 404 on `/products.json` (Vuori, Buck Mason, Princess Polly, Alo Yoga, Briogeo, Staud, Mytopicals, For Love & Lemons). We're monitoring these — some may resolve naturally, others will be addressed in a future update.

## Adding stores

If you query a store that's not in our seed list, we'll attempt detection on the fly. If it's Shopify-powered, you'll get a result and the store gets added to our daily snapshot rotation automatically. Non-Shopify stores return a clear error.

## How it works

ShopSignal uses Shopify's public `/products.json` endpoint, which every Shopify store exposes by default. No scraping required for v1. Data is structured, fast, and reliable.

For each `track_product_price` call, ShopSignal stores a daily snapshot in its history dataset. The longer the tool is in use, the deeper the price history becomes — early users automatically benefit from data the tool collected before they showed up.

The seed watchlist (84 verified Shopify-powered DTC stores) is snapshotted daily, so price history exists from day one for the most-asked-about brands.

## Why ShopSignal exists

The DTC e-commerce category has dozens of competitor-pricing SaaS tools — Prisync, Particl, Skuuudle, Price2Spy, Intelligence Node — all charging $50–$10,000+/month with dashboards. None of them are accessible to AI agents.

AI shopping agents and DTC-operator agents need this data inside their reasoning loops, not behind a separate dashboard. ShopSignal is the first MCP server purpose-built for this — pay only for what you call, no monthly minimum, agent-discoverable through Apify's MCP marketplace.

## Examples (paste these into Claude)

> **For shoppers:**
> *"Use ShopSignal to find me a white slip midi dress under $250 — compare Faithfull the Brand, Staud, Rouje, and Cuyana."*

> **For DTC operators:**
> *"Run a weekly competitor scan: what new products dropped at Skims, Wearpepper, and ThirdLove in the last 7 days?"*

> **For agencies:**
> *"Build me a snapshot of every product on sale right now at Glossier, Rhode, Kosas, and Merit. Sort by discount %."*

> **For researchers:**
> *"Track this Tibi dress for 30 days and tell me how many times it went on sale: [URL]"*

## FAQ

**Is this legal?** Yes. `/products.json` is a public, documented Shopify endpoint that stores deliberately expose. No login walls bypassed, no ToS violations.

**Can I use this for my own store's data?** Yes, but you have better options — Shopify's Admin API gives you private data ShopSignal can't see (orders, customers, financial reports). ShopSignal is for *competitor* intelligence on stores you don't own.

**What's the rate limit?** Apify handles rate limiting and proxy rotation transparently. Practical limit: ~1,000 store snapshots per hour per user.

**How do I report a bug or request a feature?** Open an issue on [GitHub](https://github.com/codesk90/shopsignal.mcp).

**What if a store isn't on Shopify?** v1 returns `{ platform: "other", error: "non-shopify store, supported in v2" }`. Cookbook for v2 (Playwright-backed) ETA: ~6 weeks post-launch.

## Roadmap

- [x] v1.0 — Shopify-only, 4 tools, daily history of seed list
- [ ] v1.1 — webhooks for `detect_drops_and_restocks` (push to Slack/Discord/email)
- [ ] v1.2 — historical sale-frequency analytics ("how often does Cuyana mark down dresses?")
- [ ] v2.0 — Playwright fallback for non-Shopify (Reformation, Net-a-Porter, etc.)
- [ ] v2.1 — Marketplace expansion (eBay sold listings, Grailed, Vinted) for resale-aware pricing

## Built by

[kodek](https://apify.com/kodek) — building MCP servers for vertical e-commerce intelligence. Sister tools coming soon for collectibles, watches, and home goods.

---

*ShopSignal is not affiliated with Shopify, Inc. or any of the brands it tracks. All data is sourced from publicly available endpoints.*
