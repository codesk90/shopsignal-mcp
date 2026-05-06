# ShopSignal — Current State
_Last updated: 2026-05-06. Parked on autopilot._

---

## Live Components

| Component | ID | Build | Status |
|-----------|-----|-------|--------|
| MCP actor | `UYYwT5xrgJsRBDU53` (kodek/shopsignal-mcp) | 0.1.12 | Live, standby mode |
| Snapshot runner | `EtMH8GFsZNAtwie3K` (kodek/shopsignal-snapshot-runner) | 0.1.5 | Cron, 3am UTC daily |
| History KV store | `LmeMRzatsx6mceX73` (shopsignal-history) | — | 151 keys, 1.6 MB, ~0.8 MB/day growth |
| Schedule | `i7Fxpc0XJibmTdns9` | — | Enabled, `0 3 * * *` UTC |

## Actor Permissions
- Snapshot runner: `FULL_PERMISSIONS` — required for cross-actor KV store writes
- MCP actor: default (reads KV via `SHOPSIGNAL_HISTORY_STORE_ID` env var)

## Endpoints
- MCP (standby): `https://kodek--shopsignal-mcp.apify.actor/mcp`
- Health: `https://kodek--shopsignal-mcp.apify.actor/health`
- Glama claim: `https://kodek--shopsignal-mcp.apify.actor/.well-known/glama.json`
- Public actor page: `https://apify.com/kodek/shopsignal-mcp`
- GitHub: `https://github.com/codesk90/shopsignal-mcp`

## Cron Health (last 2 runs)
- 2026-05-05 manual: 75/84 stores, 36,080 products, 88s
- 2026-05-06 scheduled: 74/84 stores, 35,450 products, 97s

---

## Known Issues (Parked)

### Stores failing 404 consistently (~10/84)
Vuori, Vuori Clothing, Buck Mason, Princess Polly, Alo Yoga, Briogeo, Staud, Mytopicals, For Love & Lemons, (spelldesigns.com intermittent 500 on page 2)
- All returning 404 on `/products.json` — Shopify Plus restriction or custom config
- **Action when returning:** check 7-day cron data to confirm persistent vs transient, then either drop from seed list or investigate Plus bypass

### Glama connector URL wrong
- Submitted `https://mcp.apify.com?actors=kodek/shopsignal-mcp` (Apify gateway — returns 406 for JSON-only Accept)
- Correct URL: `https://kodek--shopsignal-mcp.apify.actor/mcp`
- Support ticket #98672499 open
- `/.well-known/glama.json` deployed (build 0.1.12) — Glama will auto-detect ownership and unlock edit
- **Action when returning:** check if Glama auto-verified ownership; if yes, update URL in listing; if no, follow up on ticket

### Smithery — auth loop
- Apify's MCP endpoint advertises OAuth metadata; Smithery keeps trying OAuth flow instead of passing Bearer header
- No workaround in current Smithery UI
- **Action when returning:** check if other Apify actors have resolved this on Smithery; if yes, copy their approach

### MCP Registry / PulseMCP
- Registry requires npm publish; doesn't make sense for an Apify-hosted actor
- PulseMCP auto-ingests from registry
- **Action when returning:** check if Apify has added a registry submission path for hosted actors; raise in Apify Discord #mcp if not

---

## If You Come Back in 6 Months

1. **Check the cron** — run `curl https://api.apify.com/v2/acts/EtMH8GFsZNAtwie3K/runs?limit=5&desc=1` with the token in `.env`. If last run is >2 days ago, something broke.

2. **Check the failed stores list** — after 6 months of daily data, the persistent 404s will be obvious. Drop them or fix them.

3. **The moat is the history** — by then you'll have ~180 daily snapshots per store. `detect_drops_and_restocks` and `track_product_price` will have real signal. That's the main value prop.

4. **v1.1 quickest win** — webhooks: let users subscribe to drop/restock events via Slack/Discord/email. The data is already there; it's just a notification layer.

5. **Check Apify token** — if the token has been rotated, update Claude Desktop config at `~/Library/Application Support/Claude/claude_desktop_config.json` and re-submit credentials to Glama.

6. **Seed list needs a refresh** — some of the 9-10 dead stores will have moved to different platforms. Review and replace with working Shopify DTC brands.

---

## Token / Credentials
- Apify token: in `.env` (not committed), Claude Desktop config, and Apify Console → Account → Integrations
- GitHub: codesk90
- Glama support ticket: #98672499
