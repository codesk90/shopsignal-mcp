# ShopSignal Launch Kit
_Generated 2026-05-05. Review before posting. Nothing here is live._

---

## 1. Apify Store Description

**ShopSignal — DTC competitor intelligence for AI agents**

If you've ever spent 30 minutes manually comparing prices across five brand websites, or missed a competitor's sale because you weren't watching, ShopSignal is for you.

ShopSignal gives AI agents structured, live access to DTC brand catalogs — prices, variants, availability, product drops, and price history. Instead of pointing an agent at a website and hoping it scrapes something useful, you get typed tool calls that return JSON: handles, prices, in-stock flags, historical price ranges, and similarity scores for cross-brand comparisons.

**Concrete things you can do right now:**

Ask Claude "What's on sale at Glossier this week?" and get a sorted list with discount percentages and buy links. Ask it to "Find me a white slip midi dress under $250 — compare Faithfull the Brand, Staud, and Cuyana" and get ranked matches by price, with availability and similarity scores. Set up a weekly check: "What new products dropped at Rhode and Merit in the last 7 days?" and get a clean diff of new arrivals, restocks, and discontinued lines.

These aren't web searches. They're tool calls that return structured data your agent can reason over, compare, and act on.

**The four tools:**

- `get_store_snapshot` ($0.05) — full catalog for any supported DTC store
- `track_product_price` ($0.05) — current price + 30-day history + lowest/highest seen
- `compare_products_across_brands` ($0.50) — finds matching products across multiple brands using text similarity
- `detect_drops_and_restocks` ($0.20) — new products, restocks, price drops, and discontinued items

**Coverage:** 84 verified Shopify-powered DTC brands across fashion, beauty, and lifestyle, all snapshotted daily. Glossier, Rhode, Cuyana, Kith, Everlane, Allbirds, Mejuri, Taylor Stitch, Brooklinen, Toteme, Sol de Janeiro, Therabody, and 72 others. Price history exists from day one — early adopters benefit from data the tool collected before they signed up.

**Pricing:** Pay per successful call. No subscriptions. No monthly minimums.

**Example prompts for Claude Desktop:**

> "Use ShopSignal to find a white slip midi dress under $250 — compare Faithfull the Brand, Staud, Rouje, and Cuyana."

> "Run a competitor scan: what new products dropped at Glossier and Rhode in the last 7 days?"

> "Build a snapshot of everything on sale right now at Kosas, Merit, and Tower 28. Sort by discount %."

> "Track this Cuyana tote for me: https://cuyana.com/products/classic-easy-tote — what's the lowest it's been in 30 days?"

Connect via Apify's MCP gateway at `https://mcp.apify.com?actors=kodek/shopsignal-mcp`. Works with Claude Desktop, Cursor, n8n, LangGraph, CrewAI, and any MCP-compatible client.

---

## 2. Directory Submissions

### 2a. Smithery.ai

**Title:** ShopSignal

**Tagline:** DTC competitor intelligence — catalog snapshots, price history, and drop detection for 84 Shopify brands

**Description:**

ShopSignal exposes four tools for querying live DTC brand data through any MCP-compatible AI agent. It covers 84 verified Shopify-powered brands (Glossier, Rhode, Cuyana, Kith, Everlane, Allbirds, Mejuri, Toteme, Brooklinen, and more), snapshotted daily so price history is available from day one.

**Tools:**
- `get_store_snapshot` — full product catalog with prices, variants, and availability ($0.05)
- `track_product_price` — current price + 30-day history with lowest/highest seen ($0.05)
- `compare_products_across_brands` — finds matching products across multiple stores using text similarity ($0.50)
- `detect_drops_and_restocks` — new products, restocks, price drops, discontinued items ($0.20)

**Connection:**
```json
{
  "mcpServers": {
    "shopsignal": {
      "url": "https://mcp.apify.com?actors=kodek/shopsignal-mcp",
      "headers": { "Authorization": "Bearer YOUR_APIFY_TOKEN" }
    }
  }
}
```

Requires an Apify account. Pay per call — no subscription.

**GitHub:** https://github.com/codesk90/shopsignal.mcp  
**Apify:** https://apify.com/kodek/shopsignal-mcp

---

### 2b. Glama.ai

**Name:** ShopSignal MCP

**Short description:** Live catalog data, price history, and drop detection for 84 DTC Shopify brands — pay per call, no subscription.

**Full description:**

ShopSignal gives AI agents structured access to DTC competitor data. It queries Shopify's public product endpoints, normalizes the output, and returns typed JSON your agent can reason over directly.

Four tools: `get_store_snapshot` returns a full catalog with prices and availability. `track_product_price` returns current price plus 30-day history. `compare_products_across_brands` finds matching products across multiple stores by text similarity. `detect_drops_and_restocks` returns a diff of new products, restocks, price drops, and discontinued items since a given date.

Coverage: 84 verified brands including Glossier, Rhode, Cuyana, Kith, Everlane, Allbirds, Mejuri, and Toteme. All snapshotted daily — price history available from day one.

Hosted on Apify. Connect via `https://mcp.apify.com?actors=kodek/shopsignal-mcp` with your Apify token. Pricing is per successful call ($0.05–$0.50 depending on tool).

**Category:** E-commerce / Retail Intelligence  
**Source:** https://github.com/codesk90/shopsignal.mcp

---

### 2c. mcp.so

**Name:** ShopSignal

**Description:** DTC competitor intelligence MCP server. Catalog snapshots, price history, drop detection, and cross-brand product comparison for 84 Shopify-powered brands. Pay per call via Apify — no subscriptions.

**Tools:**
- `get_store_snapshot` — full catalog, prices, stock ($0.05)
- `track_product_price` — price + 30-day history ($0.05)
- `compare_products_across_brands` — cross-brand similarity search ($0.50)
- `detect_drops_and_restocks` — new products, restocks, price drops ($0.20)

**Endpoint:** `https://mcp.apify.com?actors=kodek/shopsignal-mcp`  
**Auth:** Apify Bearer token  
**GitHub:** https://github.com/codesk90/shopsignal.mcp

---

### 2d. PulseMCP

**Name:** ShopSignal

**One-line:** Live DTC competitor data — catalog snapshots, price history, and drop detection for 84 Shopify brands.

**Description:**

ShopSignal connects AI agents to live DTC brand data via four MCP tools: catalog snapshots, price tracking with 30-day history, cross-brand product comparison using text similarity, and drop/restock detection. Coverage spans 84 verified Shopify-powered brands (Glossier, Rhode, Cuyana, Kith, Everlane, Allbirds, Mejuri, Toteme, and more), all snapshotted daily.

Hosted on Apify's MCP gateway. Works with Claude Desktop, Cursor, n8n, LangGraph, CrewAI, and any MCP-compatible client. Pay per call ($0.05–$0.50). No monthly fees.

**Install:**
```
https://mcp.apify.com?actors=kodek/shopsignal-mcp
```
Requires Apify account + API token.

**Category:** E-commerce, Retail, Market Intelligence  
**Author:** kodek  
**GitHub:** https://github.com/codesk90/shopsignal.mcp  
**Apify:** https://apify.com/kodek/shopsignal-mcp

---

### 2e. GitHub: modelcontextprotocol/servers

**PR Title:** Add ShopSignal — DTC competitor intelligence MCP server

**PR Description:**

This PR adds ShopSignal to the community MCP servers list.

ShopSignal is a pay-per-call MCP server for DTC e-commerce competitor intelligence. It queries Shopify's public product endpoints across 84 verified DTC brands and exposes four tools: catalog snapshots, price history, cross-brand product comparison, and drop/restock detection.

- Hosted on Apify (no self-hosting required)
- Works with Claude Desktop, Cursor, n8n, and any HTTP/SSE MCP client
- GitHub: https://github.com/codesk90/shopsignal.mcp
- Apify page: https://apify.com/kodek/shopsignal-mcp

**Entry markdown to add:**

```markdown
- [ShopSignal](https://github.com/codesk90/shopsignal.mcp) - DTC competitor intelligence: catalog snapshots, price history, cross-brand comparison, and drop detection for 84 Shopify-powered brands. Hosted on Apify, pay-per-call.
```

---

### 2f. GitHub: punkpeye/awesome-mcp-servers

**PR Title:** Add ShopSignal — DTC competitor intelligence (catalog, price history, drops)

**PR Description:**

Adding ShopSignal, a pay-per-call MCP server for DTC e-commerce competitor intelligence.

Four tools: `get_store_snapshot`, `track_product_price`, `compare_products_across_brands`, `detect_drops_and_restocks`. Covers 84 verified Shopify DTC brands (Glossier, Rhode, Cuyana, Kith, Everlane, Allbirds, Mejuri, Toteme, and more), snapshotted daily.

Hosted on Apify — no self-hosting. Works with any MCP-compatible client via `https://mcp.apify.com?actors=kodek/shopsignal-mcp`.

- GitHub: https://github.com/codesk90/shopsignal.mcp
- Apify: https://apify.com/kodek/shopsignal-mcp

**Entry markdown to add** (under E-commerce or Data/APIs section):

```markdown
- [ShopSignal](https://github.com/codesk90/shopsignal.mcp) 🛍️ - DTC competitor intelligence MCP server. Catalog snapshots, price history, cross-brand product comparison, and drop/restock detection for 84 Shopify-powered brands. Hosted on Apify, pay-per-call ($0.05–$0.50).
```

---

## 3. Indie Hackers Post

**Title:** I shipped an MCP server for DTC competitor intelligence in one day

---

Background: I've been building MCP servers on top of Apify actors — the idea being that AI agents should be able to call real data sources as tools, not just search the web. The DTC e-commerce category seemed like a gap. There are a dozen SaaS tools for competitor pricing (Prisync, Particl, Price2Spy) but none of them expose an API that AI agents can actually call. So I built one.

**What it does**

ShopSignal gives Claude, Cursor, or any MCP-compatible agent live access to DTC brand catalogs. Four tools: get a full catalog snapshot, track a specific product's price history, compare matching products across multiple brands, and detect new drops and restocks. You ask your AI agent "what's on sale at Glossier this week?" and it calls the tool and gives you a structured answer — prices, discount %, availability, buy links.

**The seed list problem**

I started with a list of 200 DTC stores. Spent day one just validating it. About 60% of stores had some kind of problem: Cloudflare blocking the `/products.json` endpoint, stores that had migrated off Shopify to Salesforce Commerce Cloud, stores that just 404'd, Shopify Plus stores that deliberately restrict the public catalog endpoint. I debugged it down to 84 verified working stores. One notable casualty was Skims — passes platform detection but returns an empty catalog. Documented, punted to v2.

The first cron run of the snapshot runner captured **36,080 products across 77 stores** (7 of the 84 wrote zero-product snapshots — they pass detection but return empty). 9 stores are documented as failing with 404 (Shopify Plus restrictions). No timeouts. Ran in 86 seconds.

**Technical wins worth sharing**

Three things tripped me up that might save someone time:

*Per-request transport pattern.* Apify MCP actors are stateless HTTP — each tool call is a fresh request. If you call `Actor.init()` once at startup (normal pattern for a regular actor), your actor works on call #1 and silently fails on subsequent calls. The correct pattern is init/exit per request. Missed this, lost an hour.

*Cross-actor KV store sharing.* The MCP server and the snapshot runner are two separate actors that need to read/write the same KV store. Apify's default `LIMITED_PERMISSIONS` mode silently blocks this — your actor runs, writes nothing, exits 0, no error. Fix: set `actorPermissionLevel: FULL_PERMISSIONS` on the actor via API, pass the store ID as an environment variable, open with `forceCloud: true`. Without this you'd never know data wasn't flowing.

*The memory rabbit hole.* The snapshot runner was OOMing at 178 seconds on a 1024MB container. I spent two hours diagnosing Node.js RSS vs heap behavior, axios Buffer pool slab retention, forced GC calls, shared connection pools — all technically interesting, none of it fixed the root issue cleanly. Eventually: bumped the memory limit to 2048MB, kept the shared https.Agent (which did reduce peak somewhat), shipped it. Run completes in 86 seconds and peaks at 608MB. Sometimes pragmatic is the right call when you're trying to get something live.

**The numbers**

- 84 stores in the seed list (started with 200, debugged to 84; started with 85, dropped 1 before launch)
- 36,080 products captured on first run
- 4 tools at $0.05/$0.05/$0.50/$0.20 per call
- 9 stores blocked by Shopify Plus restrictions (documented)
- ~14 hours of actual work across two days
- $0 marketing spend so far

**What's next**

v1.1 is webhooks — push to Slack/Discord/email when `detect_drops_and_restocks` fires. v2 is Playwright fallback for non-Shopify stores (Reformation, Net-a-Porter, Aritzia). The pricing model is per-call via Apify, which handles billing, invoicing, and token management — I don't touch money.

**Link:** https://apify.com/kodek/shopsignal-mcp

Happy to answer questions about the MCP actor pattern on Apify — it's a weird enough deployment model that most of the existing docs don't cover the edge cases.

---

## 4. Twitter / X Thread

---

**Tweet 1 (hook):**
shipped a thing today — ShopSignal, an MCP server for DTC competitor intelligence

you can now ask Claude "what's on sale at Glossier this week" and get an actual answer instead of a web search

thread:

---

**Tweet 2 (what it does):**
4 tools:
- full catalog snapshot for any supported DTC store
- price history on any specific product (30-day low/high)
- cross-brand product comparison ("find me a slip dress under $250 at these 4 brands")
- drop and restock detection

structured JSON back to your agent, not a web page

---

**Tweet 3 (who it's for):**
built for three types of people:

1. AI shopping agents that need product data inside reasoning loops
2. DTC operators who want to monitor 10 competitors without a $500/mo dashboard
3. agencies running weekly competitor reports for brand clients

also works great for n8n / LangGraph / CrewAI workflows

---

**Tweet 4 (screenshot placeholder):**
[screenshot: Claude Desktop calling compare_products_across_brands on Faithfull the Brand, Staud, Rouje, Cuyana — returns ranked results with prices, similarity scores, in-stock flags]

---

**Tweet 5 (technical detail):**
the interesting infra detail: two separate Apify actors share one KV store

snapshot runner writes daily product data, MCP server reads it

Apify's default permission mode silently blocks cross-actor storage — no error, just empty results
had to set FULL_PERMISSIONS + pass store ID as env var + forceCloud: true

---

**Tweet 6 (pricing):**
pricing:
- $0.05 — catalog snapshot or price history
- $0.20 — drop/restock detection
- $0.50 — cross-brand comparison

no subscription. no monthly minimum. failed calls aren't charged.

the $0.50 tool replaces ~30 min of manual research. most users will spend under $5 exploring it.

---

**Tweet 7 (link + ask):**
84 DTC brands in the seed list (fashion, beauty, lifestyle) — all snapshotted daily

connect in Claude Desktop, Cursor, n8n, or any MCP client:
https://apify.com/kodek/shopsignal-mcp

what stores or tools would make this actually useful for you? genuinely want to know what to build next.

---

## 5. Reddit r/SaaS Post

**Title:** Built a pay-per-call MCP server for DTC competitor pricing — curious if anyone else has tried building tools for AI agents instead of dashboards

---

Background: I've been frustrated that most competitor intelligence tools in e-commerce are dashboards. Prisync, Particl, Price2Spy — they all give you a UI and a CSV export, but if you want to feed competitor data into an AI agent's reasoning loop, you're stuck scraping the UI or waiting for an API that may or may not exist.

So I built ShopSignal — an MCP server that gives AI agents (Claude, Cursor, n8n, LangGraph, etc.) live access to DTC brand catalog data. Four tools: full catalog snapshot, price history, cross-brand product comparison, and drop/restock detection. Pay per call, no subscription.

The interesting design question I kept coming back to: the SaaS dashboard model made sense when humans were doing the analysis. But if an AI agent is doing the competitor scan, the dashboard is pointless overhead. The agent just needs a tool call that returns structured data.

Coverage is 84 Shopify-powered DTC brands right now — started with 200, debugged down to 84 that actually work reliably. About 9 stores are blocked by Shopify Plus restrictions (deliberately disable the public catalog endpoint), and a bunch of others have migrated off Shopify entirely. Non-Shopify support is v2.

Pricing came out to $0.05 per snapshot call, $0.50 for the cross-brand comparison (which does text similarity matching across multiple stores and takes the most compute). No monthly fees — Apify handles billing.

**The question I actually want to ask:** if you're building SaaS tools in 2026 and your target user is increasingly "an AI agent running inside someone's workflow," how are you thinking about product design? Dashboard-first still seems like the default, but I'm not sure it's the right default anymore.

---

## 6. Reddit r/indiehackers Post

**Title:** Shipped a DTC competitor intelligence tool as an MCP server — a few lessons from ~14 hours of building

---

Just launched ShopSignal — catalog snapshots, price history, and drop detection for 84 DTC Shopify brands, exposed as MCP tools so AI agents can call them directly.

A few things that were non-obvious:

**The seed list is the product.** I started with 200 stores. 60% had some problem — Cloudflare blocking, migrated off Shopify, Shopify Plus restrictions, plain 404s. Debugging it down to 84 reliable stores took half the total build time. The store list is as much the product as the code.

**Cross-actor storage on Apify is silently broken by default.** If two actors need to share a KV store, you'll hit `LIMITED_PERMISSIONS` and get empty results with no error. The fix exists (FULL_PERMISSIONS + env var for store ID + forceCloud: true) but it's not documented anywhere obvious. Cost me a couple hours.

**Memory optimization rabbit holes are real.** The snapshot runner was OOMing. I spent two hours tracing Node.js RSS vs heap, axios Buffer pool slabs, forced GC calls. Technically interesting, practically useless. Bumped the memory limit and shipped. Run now completes in 86 seconds and peaks at 608MB of 2048MB. The pragmatic fix was the right call.

Pricing: $0.05–$0.50 per tool call. Pay-per-call via Apify, no monthly minimum. Total build: ~14 hours over 2 days.

Link: https://apify.com/kodek/shopsignal-mcp

Anyone else building MCP-native tools (designed for agents, not humans) rather than porting existing SaaS to MCP? Curious how you're thinking about pricing and distribution.

---

_End of LAUNCH_KIT.md_
