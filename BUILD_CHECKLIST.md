# ShopSignal — Day 1 build & ship checklist

Everything you need to do this week, in order. Don't skip the smoke test.

## Pre-reqs (do these first, takes ~15 min)

- [ ] Sign up for Apify at https://apify.com (free, no credit card)
- [ ] Apply for the **Creator Plan** ($1/month, gets you $500 platform credit for 6 months — explicitly built for MCP server developers)
- [ ] Install Apify CLI: `npm install -g apify-cli`
- [ ] Authenticate: `apify login`
- [ ] Confirm Node.js 20+ (`node -v`)
- [ ] Pick a final username on Apify if `codek` is taken (it shows in every URL forever)

## Local setup

```bash
cd /path/to/shopsignal-mcp
npm install
npm run build
```

## Smoke test before deploying

```bash
npx tsx scripts/smoke.ts
```

Expected output: 5 stores detected as `shopify` or `shopify_plus`, 10 Glossier products listed with prices. **If this fails, do not deploy yet** — fix the scraper first.

## First deploy to Apify

```bash
apify push
```

This packages the actor, pushes it to your Apify account, and builds the Docker image. First build takes ~3-5 min.

## Configure for Standby mode + MCP

After the first push, in the Apify Console:

1. Go to your actor → **Settings** → **Standby mode** → enable
2. Set **Standby HTTP endpoint** to `/mcp`
3. Go to **Publication** → **Monetization** → import the prices from `.actor/pricing.json`:
   - `snapshot_call` = $0.05
   - `track_call` = $0.05
   - `compare_call` = $0.50
   - `drops_call` = $0.20
4. Add the 50-call free tier for `snapshot_call` and `track_call`
5. Set the actor to **Public**

## Wire up Claude Desktop locally to test

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopsignal": {
      "url": "https://mcp.apify.com?actors=codek/shopsignal-mcp",
      "headers": {
        "Authorization": "Bearer YOUR_APIFY_TOKEN"
      }
    }
  }
}
```

Restart Claude Desktop. Try:

> *"Use ShopSignal to get a snapshot of glossier.com."*

If Claude calls the tool and returns products, you're live.

## First-day distribution (ship this part on Day 7)

- [ ] Submit to Smithery: https://smithery.ai/submit
- [ ] Submit to Glama: https://glama.ai/mcp/servers/submit
- [ ] Submit to mcp.so
- [ ] Submit to PulseMCP: https://www.pulsemcp.com/submit
- [ ] PR to https://github.com/modelcontextprotocol/servers (registry)
- [ ] PR to https://github.com/punkpeye/awesome-mcp-servers
- [ ] Apify Discord #project-rentals channel — introduce yourself, share what you built
- [ ] Tweet thread: 5-tweet launch with a 30-second demo GIF
- [ ] Indie Hackers post: "I shipped an MCP server for DTC competitor intelligence. Day 1 numbers inside."
- [ ] r/SaaS post (link to IH post or a separate writeup)

## Daily cron — start the dataset compounding

Once stable, set up an Apify Schedule that runs `get_store_snapshot` daily at 3am UTC for each of the 200 seed stores in `SEED_STORES.md`. This is what turns ShopSignal into a *real* dataset and not just a scraper.

```bash
# In Apify Console → Schedules → Create:
# Cron: 0 3 * * *
# Actor: codek/shopsignal-mcp
# Iterate: through your seed list (use a separate "snapshot-runner" actor or the
#          batch-input feature so you don't pay PPE on your own runs)
```

**Important:** when you (the actor owner) trigger your own actor, you're not charged PPE on your own calls — only the compute costs apply. Daily snapshots of 200 stores ~= $1-2/day in compute. Worth it. The history dataset is the moat.

## Day-30 review checklist

- [ ] How many organic discoveries from Apify Store search?
- [ ] How many runs total? Of those, how many were paying calls?
- [ ] What's the call-mix? (You want the cheap tools to lead and `compare_call` to be the highest revenue.)
- [ ] What did support requests look like? (None = you nailed the README. Lots = README needs work, not the product.)
- [ ] Decide: ship sister MCPs in collectibles/watches/sneakers? Or sharpen this one?

## Ship beats perfect

Everything above is shippable as-is. Some things you'll hit and need to handle:
- A couple of stores will return 200 but with weird `/products.json` shapes — handle gracefully, don't crash
- Some Shopify stores rate-limit hard (Skims, Allbirds at peak) — Apify's residential proxies fix this, just enable in `.actor/actor.json` if you see 429s
- Image hashing on the comparison tool can be slow for 30+ products — fine for v1, optimize later if it becomes the cost driver

Don't iterate before launching. Ship Day 7, fix Day 8+.
