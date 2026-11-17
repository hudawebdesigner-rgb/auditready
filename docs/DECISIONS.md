# Key decisions (and why)

## Data providers

| Need | Provider | Why |
|---|---|---|
| Amazon seller data | **Rainforest API** (Traject Data) | Licensed data provider, no scraping on our side. `seller_profile` request returns the displayed business name/address. Pay per successful request. |
| Walmart seller data | **BlueCart API** (Traject Data) | Same company and response style as Rainforest; `seller_profile` request by seller ID. |
| Legal entity + registered agent | **Cobalt Intelligence** | Pulls US Secretary of State filings (all states) incl. registered agent. OpenCorporates' free tier forbids commercial use and paid tiers start ~£2,250/yr for 500 calls. |
| Company + decision-maker contacts | **Apollo.io** | Required by spec. Owner direct phone / owner email come **only** from Apollo (enforced by the database). |

Backup option for Amazon: Keepa API (from ~€49/mo, ~1 token per seller lookup).

## Automation: Supabase Edge Functions + cron (not n8n)

- One system: database, code, schedules and logs in Supabase — nothing extra to host or pay for.
- n8n would need its own server (~$20+/mo) and splits logic across two tools.
- The "Run now" button and jobs page are just database rows + an Edge Function call.

## Hosting: Netlify (instead of Vercel)

Vercel's free Hobby plan is for **non-commercial** use only; this is a business tool.
Netlify's free plan allows commercial use and is equally simple. (Vercel Pro at $20/mo
works too if you prefer it.)

## US sellers only

`settings.us_only = true`. Every seller is **collected** first (that's the only way to
learn its address), then sellers whose displayed address isn't in the US are marked
`match_status = 'skipped'`, `skip_reason = 'non_us'` — **no Cobalt or Apollo credits are
spent on them**.

## Changes to the data model you proposed

| Change | Why |
|---|---|
| Added `address_city/state/postal_code/country` + `is_us` on sellers | Needed for the State filter and the US-only rule. The full displayed address is still kept as-is. |
| Added `collect_status`, `match_status`, `enrich_status` (+ `skip_reason`) on sellers | Makes the POC report's "match rate per step" exact, and lets jobs find unenriched sellers. |
| Added `source` + `raw` on sellers | Every value has a source; `raw` keeps the original API response for auditing. |
| Added `rating_count` | Rating alone is misleading without the count. |
| `legal_entities`: added `is_primary`, `match_reasons`, `formation_date`, `source_url`, `raw` | A seller can have several candidate entities; one is marked best. `match_reasons` explains the score. |
| `legal_entities.source` limited to `cobalt` / `opencorporates` / `manual` | Registered agent data can only come from public filings. |
| `contacts.contact_type` = `business_phone`, `business_email`, `owner_direct_phone`, `owner_email` | Split "email" into business vs owner so they're never mixed up. |
| **Registered agent is NOT a contact type** — it lives only on `legal_entities` | A registered agent is usually a filing service (e.g. "Registered Agents Inc"), not someone to cold-call. Keeping it out of contacts stops it ending up in call lists, and avoids storing it twice. |
| Database rule: owner contacts must have `source = 'apollo'` and a person's name | Enforces your hard rule even if code has a bug. |
| `confidence` is 0–100 and required on every contact | "Source and confidence on every enriched field." |
| Added `do_not_contact` (+ reason) on sellers and contacts | Needed for cold calling / email compliance. |
| Added `provider`, `attempts`, `http_status`, `duration_ms`, `job_run_id` on `enrichment_runs` | Retry/failure logging and credit tracking per provider. |
| New tables: `job_runs`, `duplicate_candidates`, `settings`, `team_members`, `team_allowed_emails` | Jobs page (Phase 3), duplicate review (Phase 2), credit limit / thresholds (Phase 3), and access for you + your boss only. |
| New view: `daily_credit_usage` | Powers the Apollo daily credit limit. |
| Fuzzy matching via Postgres `pg_trgm` + `name_normalized` | "Acme Widgets, L.L.C." and "ACME WIDGETS LLC" normalise to the same name. |
