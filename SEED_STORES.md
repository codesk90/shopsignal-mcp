# ShopSignal — Seed Store List

85 DTC fashion / beauty / lifestyle stores, all verified Shopify or Shopify Plus by `npm run healthcheck` as of 2026-05-04. Snapshot daily to build the price-history dataset that becomes ShopSignal's moat.

## Why these 85

- **Shopify-native** — `/products.json` works on each, verified end-to-end by the detector
- **Mix of well-known and emerging** so search queries surface results either way
- **Spread across price tiers** ($20 t-shirts to $1,500 dresses) so the comparison tool has range
- **Active drops** so `detect_drops_and_restocks` has signal from day one

---

## Tier 1: women's fashion (27)

agolde.com · allbirds.com · cuyana.com · eberjey.com · everlane.com · faithfullthebrand.com · girlfriend.com · gorjana.com · isabelmarant.com · journelle.com · mejuri.com · missoma.com · motherdenim.com · negativeunderwear.com · onlyhearts.com · outdoorvoices.com · princesspolly.com · richer-poorer.com · rouje.com · shopdoen.com · skims.com · spelldesigns.com · staud.clothing · stinegoya.com · thefrankieshop.com · tnuck.com · toteme.com

## Tier 2: men's fashion (15)

aimeleondore.com · birddogs.com · buckmason.com · kith.com · ministryofsupply.com · noahny.com · oliverpeoples.com · onlyny.com · pact.com · publicschoolnyc.com · saturdaysnyc.com · stadiumgoods.com · stussy.com · taylorstitch.com · vuori.com

## Tier 3: beauty / skincare / wellness (24)

briogeohair.com · cosrx.com · davines.com · gisou.com · glossier.com · iliabeauty.com · kosas.com · kravebeauty.com · meritbeauty.com · mytopicals.com · oribe.com · oseamalibu.com · ranavat.com · refybeauty.com · rhodeskin.com · soldejaneiro.com · summerfridays.com · supergoop.com · tower28beauty.com · truebotanicals.com · vacation.inc · versedskin.com · victoriabeckhambeauty.com · westmanatelier.com

## Tier 4: lifestyle / home / accessories (10)

alo.yoga · brooklinen.com · cometeer.com · fellowproducts.com · fromourplace.com · hyperice.com · parachutehome.com · stanley1913.com · therabody.com · vuoriclothing.com

## Tier 5: emerging/indie (9)

andieswim.com · forloveandlemons.com · khaite.com · staudclothing.com · summersalt.com · thirdlove.com · tibi.com · ullajohnson.com · wearpepper.com

---

## Notes for the dev

- Some URLs redirect to `www.` variants; the scraper normalizes both
- A few stores are headless Shopify (Hydrogen) — `/products.json` still works on the Shopify backend even when the storefront is custom; the detector scores `/cdn/shop/` paths and `Shopify.routes` JS globals as positive signals
- For the seed-list cron, randomize call order across the day to spread compute load
- Keep the seed list in a separate file (this file) so you can grow it without redeploying code
- Last verified 2026-05-04. Re-run `npm run healthcheck` periodically to detect migrators
- `healthcheck` confirms platform detection only. Some Shopify Plus stores restrict `/products.json` even when Shopify-powered (e.g. skims.com returns 404). These pass healthcheck but fail catalog fetches. Manual smoke-test a sample after every 30 days.
- Stores known to require browser-fingerprint proxy (out of v1 scope): aritzia.com, rhone.com, monicavinader.com, agentprovocateur.com, stockx.com, jcrew.com, madewell.com, lululemon.com, urbanoutfitters.com, saintlaurent.com — Cloudflare/Akamai bot challenges that plain Apify residential proxy can't bypass. Add when v2 ships browser-pool support.
- Confirmed migrants from Shopify (do NOT re-add until detection updated): drunkelephant.com (→SFCC), reformation.com (→SFCC). Track for post-v1 platform-aware scrapers.

---

## Caveats — restricted `/products.json`

Some Shopify Plus stores are on Shopify but have disabled or gated their public `/products.json` endpoint. They pass `healthcheck` (which only tests platform detection) but return 0 products when actually scraped. Add stores here as they're discovered, and remove them if they re-open the endpoint.

| Domain | Verified | Symptom |
|---|---|---|
| skims.com | 2026-05-04 | `/products.json` returns HTTP 404 |
