# StayDirect LK — Engineering plan (Prompt 1)

Source of truth for product scope: [spec.md](spec.md). This file records how we build it.
Brand: **StayDirect LK**, root domain `staydirect.lk` (configurable via `ROOT_DOMAIN`).

## 1. MVP split into three phases

The MVP in spec §3 (everything tagged `[MVP]`) is delivered in three phases. Phase 1 ends with a
guest booking and paying a deposit on `villa.staydirect.lk` and those nights appearing blocked on
Airbnb through the room's iCal export.

### Phase 1 — Inventory, booking, iCal, deposits (Prompt 2)
- Owner phone-OTP auth (SMS via Notify.lk; console provider in dev), JWT sessions, roles owner/manager/staff.
- Property, room, rate-plan setup (seasonal, weekend, long-stay 7+/28+, last-minute; deposit %, cancellation policy, min nights, CTA/CTD).
- `night_inventory` + `hold` (15 min, 12 h for request-to-book, configurable for bank/LankaQR), unique active-night index.
- Availability search (rate plans → nightly price → stay discounts → taxes → display currency).
- Booking creation + hold inside one transaction; request-to-book approval.
- PayHere hosted checkout and PayPal Checkout under the owner's credentials; signature-verified, idempotent webhooks confirm the booking.
- LankaQR and bank-transfer instructions with booking reference; slip upload; manager confirms; cash at walk-in.
- iCal export per room; import worker every 15 min (fetch → parse → diff → write → conflicts → alert); "sync now".
- Confirmation email via Resend (EN/DE/FR/HI); owner alerts by WhatsApp Cloud API with email fallback.
- Owner web dashboard: today's arrivals, revenue by source, commission saved, unpaid balances, sync health, conflicts.
- Guest site (single clean theme): home, rooms, location, contact, book; per-subdomain + custom-domain routing.
- Tests: concurrent reservation of the same night, expired hold releases the night, 1,000-request season simulation, pricing, iCal diff, webhook signatures/idempotency. Demo seed: 6-room villa in Mirissa.

**Done when:** on a deployed subdomain a guest books, pays a PayHere sandbox deposit, the booking is
`confirmed`, the room's `.ics` shows the nights, an Airbnb test listing imports the block, and the
concurrency + simulation tests are green in CI.

### Phase 2 — Messaging, money hygiene, reports
- WhatsApp inbox per property and quick replies (top 30 questions × EN/DE/FR/HI).
- Balance reminders, cancellation per policy with refund workflow (PayHere/PayPal refund APIs, manual refund tasks), no-shows.
- Receipts/invoices with SLTDA number and tax lines (HTML → PDF); monthly PDF statement and Excel export.
- Guest-site pages: gallery, experiences, reviews, SEO basics (JSON-LD, sitemap, robots), currency switcher with daily FX.
- **Done when:** a pilot owner can run a week of operations (bookings, balances, a refund, a statement) without leaving the app.

### Phase 3 — Admin console, themes, compliance
- Admin console: tenants, plans, sync health, gateway status, commissions owed, support tickets, feature flags, template editor, translation management.
- Three selectable guest-site themes (Prompt 5), custom domains via Vercel API, AI-assisted listing translations.
- GDPR/PDPA: privacy notice, guest data export and deletion, retention jobs (24/36 months; financial records 7 years).
- **Done when:** 10 pilot properties are live, onboarded in under 60 minutes each, with monitoring and backups verified by a restore.

Release 2 and 3 features (concierge, housekeeping, add-ons, multi-property, OTA API…) follow in Prompts 3 and 4.

## 2. Monorepo layout

```
apps/
  api/        NestJS 11 REST API + BullMQ workers (src/main.ts, src/worker.ts)
    migrations/   plain SQL, applied in order (reviewed by hand — CLAUDE.md)
    src/modules/  auth, properties, rooms, rate-plans, availability, bookings,
                  payments, webhooks, ical, notifications, dashboard, fx, public
    test/         integration tests against real Postgres (embedded or TEST_DATABASE_URL)
  web/        Next.js 16 App Router: guest sites (/s/[site]), owner web (/owner), marketing (/)
  mobile/     Flutter owner app (Phase 2 of R2; placeholder now)
packages/
  shared/     TS types, enums, zod schemas, pricing + date utilities (used by api and web)
docs/         spec.md, plan.md
```
npm workspaces (no extra tooling needed on a fresh machine). Node 24, TypeScript 5.9.

## 3. Schema (spec §6, with the changes we made)

Implemented in [apps/api/migrations](../apps/api/migrations). Every table has `tenant_id`; RLS is
enabled on all of them (see "Tenancy" below). Deviations from §6, deliberately:

| Change | Why |
|---|---|
| `night_inventory` stores only occupied nights; "free" is the absence of an active row. Statuses `held`, `reserved`, `blocked`, `released`. | 15 rooms × 365 days of "free" rows is noise; history is kept as `released` rows. |
| Unique index `(room_id, date) WHERE status IN ('held','reserved','blocked')` | The spec's index covers `reserved` only; covering holds makes two concurrent checkouts fail at hold time, not after payment. |
| `sync_conflict` table | Records OTA nights that collided with a direct night, with both references and the resolution. |
| `rate_plan.kind` (`seasonal`, `weekend`, `long_stay`, `last_minute`), `adjustment_pct`, `min_stay_nights`, `within_days`, `priority`, `closed_to_arrival/departure` | One table covers all four MVP rate-plan types. |
| `room.base_guests`, `property.base_currency`, `deposit/cancellation defaults`, `tax_pct` | Needed by pricing; not listed in §6. |
| `booking.reference` (e.g. `SD-7KQ2MX`), `booking.mode` (`instant`/`request`) | Human reference for bank/LankaQR transfers; request-to-book. |
| `webhook_event (provider, event_id)` unique | Idempotency for every webhook. |
| `otp_code`, `booking_status_log` | Phone OTP; logged status transitions. |

### Tenancy and RLS
- The API connects with the database owner role (system context: workers, webhooks, guest site).
- Owner/manager requests run inside `withTenant(tenantId)`: `SET LOCAL ROLE staydirect_tenant` +
  `set_config('app.tenant_id', …, true)`. Policies on every table: `tenant_id = app_current_tenant()`.
- Supabase's `anon`/`authenticated` roles get no policies, so the PostgREST endpoint exposes nothing.

### Shared types
`packages/shared` exports enums (`BookingStatus`, `NightStatus`, `PaymentMethod`, `Channel`, …),
DTO interfaces for every public/owner endpoint, zod request schemas, and pure functions
`priceStay()`, `nightsBetween()`, `convert()` used by both the API and the guest site.

### Env vars per app

| App | Variable | Notes |
|---|---|---|
| api | `DATABASE_URL` | Supabase direct/session pooler (Singapore) |
| api | `REDIS_URL` | Upstash `rediss://…`; unset in dev → in-process scheduler |
| api | `JWT_SECRET`, `ENCRYPTION_KEY` | 32-byte base64; `ENCRYPTION_KEY` encrypts `gateway_config` (AES-256-GCM) |
| api | `ROOT_DOMAIN`, `PUBLIC_API_URL`, `WEB_URL`, `OWNER_APP_URL` | URLs used in emails, payment return/notify URLs |
| api | `SMS_PROVIDER` (`console`/`notifylk`), `NOTIFYLK_USER_ID`, `NOTIFYLK_API_KEY`, `NOTIFYLK_SENDER_ID` | Owner OTP |
| api | `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| api | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ALERT_TEMPLATE` | Platform number for owner alerts (per-property numbers in R2) |
| api | `PAYHERE_SANDBOX`, `PAYPAL_SANDBOX` | `true` until go-live; merchant credentials are per property |
| api | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Photos and slips; unset → local disk in dev |
| api | `FX_FEED_URL` | default `https://open.er-api.com/v6/latest/USD` |
| api | `WEB_REVALIDATE_URL`, `REVALIDATE_SECRET` | API tells Next.js to revalidate a property's pages |
| api | `SENTRY_DSN` | optional |
| web | `NEXT_PUBLIC_API_URL`, `API_URL` | public vs server-side API base |
| web | `ROOT_DOMAIN`, `OWNER_HOST` (`app.staydirect.lk`) | hostname routing |
| web | `REVALIDATE_SECRET` | matches api |
| web | `NEXT_PUBLIC_PAYPAL_ENV` | `sandbox`/`live` |

## 4. Hostname routing and caching

`apps/web/src/proxy.ts` (Next 16's renamed middleware) rewrites by `Host`:

| Host | Rewrite to |
|---|---|
| `staydirect.lk`, `www.staydirect.lk` | marketing: `/…` → `/m/en/…`, `/si/…` → `/m/si/…` |
| `app.staydirect.lk`, `admin.staydirect.lk` | `/owner/*`, `/admin/*` (robots.txt disallows everything) |
| `{slug}.staydirect.lk` | `/s/{slug}/{lang}/*`, language from the URL prefix (`/de/rooms`; English unprefixed) |
| anything else (custom domain) | `/s/{host}/{lang}/*` → page resolves `property.custom_domain = host` |
| local dev | `villa-lagoon.localhost:3000` works natively; `/s/villa-lagoon/…` also by path (internally `villa-lagoon~d`) |

**Deployment:** Vercel Pro (wildcard `*.staydirect.lk` needs Pro; DNS on Cloudflare with
`*.staydirect.lk CNAME cname.vercel-dns.com`, proxy off). Custom domains: owner adds a CNAME to
`cname.vercel-dns.com`; we register it via the Vercel Domains API (Phase 3) and Vercel issues TLS.
Cloudflare Pages is the fallback if Vercel Pro is not wanted (free wildcards via Workers routes).

**Cache strategy for guest pages:**
- Indexable guest pages (home, rooms, room, location, things to do, contact) are rendered on their
  first visit and then served from the cache (ISR; `generateStaticParams` returns `[]`). Property data
  is fetched with tags `site:{slug}` / `site:{custom_domain}`; the API calls `/api/revalidate` after
  owner edits, add-on and review changes, so pages update within seconds.
- Pages read no cookies or headers. Prices are converted in the browser from the `sd_cur` cookie,
  which proxy.ts sets on the first visit from the country (or browser region).
- The date picker's closed nights come from `/api/calendar/{site}`, edge-cached per site and cleared
  (`avail:{site}`) a few seconds after any night changes (`InventoryService` → `RevalidateService`).
  Live quotes (`/availability`) stay uncached.
- Images: Next `<Image>` with R2 origin, AVIF/WebP, max 150 KB; fonts self-hosted via `next/font`.
- Checkout and confirmation pages are dynamic and `no-store`.

## 5. Accounts and credentials (with lead times)

| Account | Needed for | Lead time | Phase |
|---|---|---|---|
| GitHub | code, Actions CI | minutes | 1 |
| Supabase (Singapore) | Postgres | minutes; Pro tier (USD 25) before paying customers for PITR | 1 |
| Upstash Redis | BullMQ | minutes | 1 |
| Fly.io (sin) | API + workers | minutes; card required | 1 |
| Vercel **Pro** | guest sites with wildcard domain | minutes; USD 20/month | 1 |
| Cloudflare | DNS, R2 | minutes; nameserver change up to 24 h | 1 |
| `staydirect.lk` via LK Domain Registry | domain | 1–3 working days (document check) | 1 |
| Resend | email, DKIM on `staydirect.lk` | DNS verify ~1 h | 1 |
| PayHere sandbox | dev payments | instant | 1 |
| PayHere live (per owner) | owner payments | **3–10 working days** (business docs, bank account) | pilot |
| PayPal Business + REST app (per owner) | international payments | 1–5 days; withdrawal to LK bank needs linked card/bank | pilot |
| Notify.lk | OTP SMS | 1–2 days for sender-ID approval | 1 |
| Meta Business verification + WhatsApp Cloud API | owner alerts, inbox | **2–10 days** verification; templates 1–2 days each | start now |
| Google Maps Platform | map embed, Places | minutes (billing account) | 1 |
| Sentry | errors | minutes | 1 |
| Google Play developer | Flutter app | 1–3 days identity verification | R2 |

## 6. The 20 riskiest decisions

| # | Decision | How we handle it |
|---|---|---|
| 1 | Double booking (direct vs direct) | Unique partial index on active nights; holds and reservations written only inside a transaction; test proves two concurrent requests → exactly one wins. |
| 2 | Double booking (OTA vs direct) | iCal lag is unavoidable; OTA writes that collide are logged in `sync_conflict` and the owner is alerted with both references and a suggested action. Export updates immediately on confirm. |
| 3 | Hold expiry | Holds carry `expires_at`; a new hold first releases expired holds on the same nights inside its own transaction (no reliance on the sweeper); the sweeper marks bookings `abandoned` every minute. |
| 4 | Payment after the hold expired | Webhook re-attempts the hold → reserved conversion; if the nights were taken, the payment is recorded, the booking is flagged `needs_refund`, and the owner is alerted to refund or relocate. Money is never silently kept. |
| 5 | Slow manual payments (bank, LankaQR) | Selecting them extends the hold to `manual_payment_hold_hours` (default 24 h); manager confirms from slip; expiry releases nights. |
| 6 | iCal lag (15 min) | Explained in onboarding; "sync now" button; optional cleaning buffer reduces back-to-back collisions; R3 adds direct API. |
| 7 | iCal feed failures | Per-source status and consecutive-failure count; 3 failures → owner alert; failed fetches never remove nights (only a successful parse can release). |
| 8 | iCal removals | A night is released only when the source that created it no longer lists it in a successful fetch; manual and direct nights are never touched by import. |
| 9 | Currency display | Rates stored in one base currency; display = daily FX + 1.5% buffer, labelled "approx."; charge currency shown before paying; invoices show both. |
| 10 | Rounding | All money as `numeric(12,2)` in DB and integer minor units in JS math; PayHere amounts formatted to 2 dp exactly as hashed. |
| 11 | Refunds | Every refund is a negative `payment` row; gateway refund API where available, otherwise a manual refund task; no updates/deletes on money rows (DB trigger rejects them). |
| 12 | Cancellation policy changes | Policy is snapshotted onto the booking at creation; refund maths uses the snapshot. |
| 13 | Holding guest money | Never: every gateway runs under the owner's merchant account; we only store their encrypted credentials. |
| 14 | Webhook spoofing/replay | PayHere `md5sig` verification; PayPal capture verified server-to-server; `webhook_event(provider,event_id)` unique for idempotency. |
| 15 | Concierge/AI confirming bookings | Out of scope for Phase 1; rule recorded: only a confirmed payment changes inventory. |
| 16 | Tenant data leakage | RLS on every table with `SET LOCAL ROLE` per request; guest-site endpoints expose an explicit public projection only. |
| 17 | GDPR for EU guests | Minimal guest data (no passport images), privacy notice link in every footer, export/delete endpoints (Phase 3), retention job anonymizes after 24/36 months. |
| 18 | Timezones | All stay dates are `date` (property-local nights, Asia/Colombo default); timestamps `timestamptz`; "today" computed in the property timezone. |
| 19 | Rate-plan overlaps | Highest `priority` wins per night, ties → most recent; stay-level discounts (long-stay, last-minute) apply the single best one. Covered by unit tests. |
| 20 | Guest page speed on 4G | Static per-site pages, client-side availability, image budget 150 KB, no heavy client libraries on the first view; Lighthouse in CI (Phase 2). |

## 7. Release 2 (Prompt 3) — WhatsApp, concierge, housekeeping, add-ons

Built on branch `phase-2-concierge-ops`; schema in [0002_concierge_ops.sql](../apps/api/migrations/0002_concierge_ops.sql).

| Area | How it works |
|---|---|
| WhatsApp inbox | `POST /webhooks/whatsapp` verifies `X-Hub-Signature-256` (app secret) over the raw body and is idempotent on the WhatsApp message id. A message belongs to the property whose own `phone_number_id` received it, or (shared platform number) to the sender's most recent booking. Free text is only sent inside the 24-hour service window; outside it, templates. |
| Templates | Generated from the same i18n strings the API sends ([templates.ts](../apps/api/src/modules/notifications/templates.ts)), so approved text never drifts. `npm run whatsapp:templates` submits all 31 (EN/DE/FR/HI). A test enforces Meta's rules (no variable at the start or end). |
| Quick replies | 30 topics × 4 languages, filled from the profile and house guide on "Load defaults"; owners edit freely. |
| AI concierge | Claude (`CONCIERGE_MODEL`, default `claude-opus-5-5`, effort `low`) with four strict tools: `check_availability`, `quote`, `send_booking_link`, `escalate`. No tool can write inventory or bookings — only a payment webhook confirms. Server-side refusal fallback (`fallbacks: "default"`) is on; a refusal or error escalates to the host. The property facts and whole knowledge base sit in a cached system prompt (small properties don't need retrieval yet); today's date is a separate uncached block. Spend is tracked per property per month in `ai_usage`; over `CONCIERGE_MONTHLY_BUDGET_USD` (default USD 1 ≈ LKR 300) the concierge hands over instead of calling the model. |
| Sequences | Every 15 min, 08:00–21:00 property time: booking confirmed (WhatsApp), 7 days before, 1 day before, arrival (house guide), mid-stay (add-ons), check-out (review request). One send per booking and trigger (`sequence_send` claim row). Free text inside the window, otherwise the matching template; email fallback. |
| House guide | `/guide/{guide_token}` — token-gated because it contains the Wi-Fi password; sent on arrival day. |
| Housekeeping | Hourly job builds each property's board once local time passes 06:00 (clean for check-outs, prepare for check-ins incl. OTA arrivals), idempotent per day, then WhatsApps each cleaner a link to `/t/{token}` (no login). Maintenance tasks carry photos and cost. |
| Add-ons | Catalogue per property, providers per tenant. Each order splits the amount into provider / owner (`commission_pct`, default 12.5%) / platform (`platform_pct`, default 10%) — a DB check makes the parts sum to the amount. The amount is added to the booking total (collected with the stay); cancelling reverses it. Providers get a WhatsApp job card linking to `/j/{token}`; the guest's phone is shown only after they accept. Monthly commission summary per currency. |
| Reviews | Review link on check-out day. 4–5★ are public and invite the guest to Google; 1–3★ stay private and alert the owner. |
| Guest CRM | Guests per property with stays and spend; discount codes (manual, and an automatic personal "book direct next time" code ~11 months after a stay). Codes apply in availability quotes and at booking; uses are counted on confirmation. |
| Owner app | Flutter (`apps/mobile`): Today (arrivals, departures, unpaid balances green/red, sync health), Tasks, Inbox with quick replies; every screen cached on the device for offline viewing; dark mode. |

**Accounts needed before switching it on:** Meta app secret + verify token for the webhook, `WHATSAPP_BUSINESS_ACCOUNT_ID` to submit templates (approval 1–2 days each), and `ANTHROPIC_API_KEY` for the concierge.

## 8. Release 3 (Prompt 4) — multi-property, managers, OTA adapter, long stays, ledger, admin

Built on branch `phase-3-multi-property`; schema in [0003_multi_property_ops.sql](../apps/api/migrations/0003_multi_property_ops.sql).

| Area | How it works |
|---|---|
| Team & access | Owners invite managers/staff by link (`invite`, accepted at OTP login with `inviteToken`). A manager can be limited to some properties (`user_property`). Enforced **in Postgres**: `AuthGuard` puts the allowed ids in a per-request context, `DbService.withTenant` sets `app.property_ids`, and restrictive RLS policies (`property_scope`) on every property-scoped table AND with tenant isolation. No call site can forget the check. |
| Feature flags & plans | `feature_flag` lists the plans that include each feature (spec §8); a per-tenant override wins. `FlagsService.require()` returns 403 `feature_not_in_plan`; `/auth/me` returns the effective flags for the UI. Plan prices and property limits live in `PLAN_PRICING` (shared). |
| Manager companies | `property_owner` (encrypted payout details) and `property.owner_id`. Owner statement for a month = direct + OTA room revenue (pro-rated by night) + the owner's add-on share − management fee % − task expenses − the platform fee for that property (LKR 3,000/managed property on flat plans, or the plan % of direct revenue). Finalising writes an append-only `owner_statement` + `invoice(kind owner_statement)` + PDF; re-issuing supersedes. Excel export. |
| White label & themes | Manager-plan tenants set a brand (`tenant.brand`); guest sites, emails and documents drop "Powered by StayDirect". Guest-site themes are rows in `theme` edited in the admin console and served as CSS variables (`themeTokens`). |
| Long stays | `rate_plan.kind = 'monthly'`: stays ≥ `min_stay_nights` (default 28) are priced at `monthly_rate / 30` per night and don't stack with long-stay/last-minute discounts. Metered utilities are entered as `utility_reading` and billed on the next invoice. |
| Invoices | Numbered per tenant and year (`INV-2026-0001`, statements `STM-…`) through `invoice_counter`; append-only (corrections supersede). Long-stay invoices carry the residence confirmation a Digital Nomad Visa renewal needs (guest, passport last 4, address, period, SLTDA number). PDFs via pdfkit (no headless browser on the API box). |
| OTA connectivity adapter | `ChannelPartner` interface (`pushAri`, `fetchRevisions`, `ack`) with a DB-backed `SimulatedPartner` until a real partner is chosen (Channex, Rentals United… implement the same three calls). Triggers on `night_inventory` queue changed room-nights in `channel_ari_queue`; rate/room changes flag a full push. A worker pushes every minute and imports booking revisions: real `booking` rows with guest details, nights reserved through `InventoryService.reserveOta`, overlaps recorded as `sync_conflict`, cancellations release nights, each revision applied once (`channel_event`). iCal import is skipped for channels covered by a live connection. |
| Provider ratings | Guests rate an experience after it happened. ≥3 ratings averaging < 4.0 → provider removed, their add-ons switched off, owner alerted; the owner can reinstate. |
| Commission ledger | Monthly job (idempotent): flat plan fee (or % of confirmed direct-booking value on percentage billing) + the platform's add-on commission, in LKR at the period's FX. Append-only; marking paid/void adds a superseding row. Trial/pilot tenants pay no subscription. |
| Admin console | StayDirect staff sign in with the same OTP if their phone is in `platform_admin`; admin tokens (`adm` claim) are refused by tenant endpoints and vice versa. Tenants (plan, billing, sync health, gateways, channel), feature flags and overrides, ledger, support tickets, theme editor, translation editor. Translation overrides apply to emails; WhatsApp template keys are locked because Meta approved their exact text. |

**Not built yet:** a real connectivity partner (needs the choice + account), collecting platform fees by PayHere recurring (the ledger records what is owed; payment is marked by an admin), payouts to add-on providers on the owner's behalf.

## 9. Release 4 (Prompt 5) — guest booking site that converts

Built on branch `phase-4-guest-site`; schema change in [0004_guest_site.sql](../apps/api/migrations/0004_guest_site.sql) (hero video column, redesigned theme tokens).

| Area | How it works |
|---|---|
| Themes | Three themes designed with the frontend-design and UI UX Pro Max skills from Sri Lankan subjects (no Claude Design handoffs existed): **lagoon** (coastal villa, Cormorant/Manrope, brass horizon line), **jungle** (tea estate, Lora/Work Sans, verandah arches), **surf** (surf lodge, Barlow Condensed, tuk-tuk-yellow band and CTA). Each is a light and dark palette, a font pair and a CTA colour in `apps/web/src/themes/registry.ts`, plus one block in `app/s/[site]/guest.css`. The page inlines only validated values. Admin theme-editor tokens still override colours, radius and fonts (fonts limited to the six shipped ones), and white-label brand colours re-derive button text for contrast. A handoff replaces one theme by swapping its entry and CSS block (`design-system/staydirect-guest/pages/themes.md`). |
| First view | Within 375 × 667: name, photo or looping video, date search. The video loads after `load` + idle and is skipped for reduced motion, Save-Data and 2G, with a pause button. The screenshot script fails if the search button falls below 667 px. |
| Date picker | Native date inputs server-side (works without JavaScript); once hydrated, buttons open a calendar sheet loaded on demand. It greys out nights with every room taken (`GET /public/sites/:site/calendar`), never lets a stay span a closed night (check-out on it is allowed) and is a keyboard-navigable ARIA grid in a focus-trapped dialog. |
| Rooms | Swipeable galleries using CSS scroll-snap (no gesture library), dots, arrow buttons for mouse and keyboard. A new room page. Prices in the guest's currency: `sd_cur` cookie, then the CDN country header, then `Accept-Language`. Sticky "Check dates" bar on phones, hidden while the search is on screen. |
| Checkout | Dates → Details → Pay with a progress indicator. Step 1 is priced on the server (no layout shift). Step 2 states, in words, what is paid now and when the rest is due, plus the cancellation policy, before the checkbox. Pay groups methods by where the guest pays from (abroad: card, PayPal, bank/Wise; India: UPI via LankaQR, card; Sri Lanka: card/Genie/FriMi, LankaQR, bank), guest's own group first. |
| Confirmation | The exact WhatsApp text the guest received (`PublicBooking.confirmationMessage`, same function as the sequence), directions, WhatsApp the host, a map that loads only on tap. |
| Trust | Rating and count, SLTDA licence, host photo/initial, and "usually replies within…" from the median first human/AI reply over 90 days (`responseMinutes`; hidden with fewer than 3 replies). |
| Motion | `motion` 14 through `LazyMotion` + `m.*` only, features loaded on demand, `MotionConfig reducedMotion="user"`. Used for the calendar sheet and checkout step changes; nothing animates on page load. |
| Performance | Fonts self-hosted by next/font with only the weights used, none preloaded; photos at quality 60 (AVIF), every image under 150 KB (largest ≈ 24 KB at 375 px); hero image preloaded with high fetch priority; no header blur. Experimental `inlineCss` was tried and dropped: it copied the whole app's CSS into each page about three times (321 KB HTML). |
| Owner pass | Today-first owner dashboard, mobile bottom navigation, consistent green/red paid states, a sync-health chip in the header, dark mode checked. Flutter: tuned dark theme, sync banner on Today, status colours, 48 dp targets. |

**Measuring.** `npm run screenshots` (apps/web) books in every theme and captures each step. `npm run lighthouse` runs Lighthouse mobile (simulated slow 4G) on the home page and checkout per theme: median of several runs, the image budget, and minimum scores. CI job `guest-site` runs both on a seeded stack and uploads the results; its performance floor is 85 because shared runners are slow and noisy. Results from this machine are in `docs/lighthouse/summary.json`.

### Sinhala owner apps and guest sites (branch `sinhala-owner-app`)

| Area | How it works |
|---|---|
| Language | `app_user.language` (`en`, `si`), set with `PATCH /auth/me` from either app; the web also keeps `sd_lang` so the login page opens in the last language. The switch is in the owner header (labelled in the other language) and on More. |
| Text | Web: typed dictionaries per area (`apps/web/src/i18n/owner/{en,si}`), `getT()` in server code, `useT()` in client code, dates with Sinhala month names (`si-LK`). Flutter: gen-l10n ARB files. Terms fixed in `GLOSSARY.md`. Needs native-speaker review before launch. |
| Type | Abhaya Libre (FM Abhaya revival) for headings, Noto Sans Sinhala for text; Sinhala unicode range only, so English pages never download them. 17 px base, line height 1.7, labels wrap. Every guest theme falls back to Noto Sans Sinhala for owner-written Sinhala. |
| Look | Same as English: no extra colours or ornament (decided after review). Only the fonts and spacing change. |
| Holidays | `public_holiday` (platform data, no tenant): 2026–2027 public, bank and mercantile holidays seeded from the Central Bank list that follows Extraordinary Gazettes 2438/22 and 2493/05; Poya days marked. Admin console → Holidays to correct or add years. Owner calendar marks them; Today warns on Poya days (no alcohol sold or served). |
| Not translated | API error messages beyond the common ones, PDFs (pdfkit cannot shape Sinhala conjuncts), owner WhatsApp alerts (need Meta-approved Sinhala templates). |
| Guest sites | Sinhala is a guest-site language inside all three themes (`apps/web/src/i18n/guest/{en,si}`, `siteContext().t`, `useGT()`). The guest picks it with the සිං / EN button (cookie `sd_glang`); a browser set to Sinhala gets it by default. Only the font changes: serif themes fall back to Abhaya Libre, Surf to Noto Sans Sinhala; headings get more line height for the vowel signs. Sinhala is also a guest message language: emails and WhatsApp inside the 24-hour window are in Sinhala; WhatsApp templates fall back to English until Meta approves Sinhala versions (`APPROVED` in `templates.ts`). |

## 10. Release 5 (Prompt 6) — SEO for every property site and the marketing site

**Guest sites (every property, automatically)**
- Five languages, each with its own URL: `/` (English, x-default), `/si`, `/de`, `/fr`, `/hi`. An
  unprefixed URL goes to the guest's earlier choice (cookie) only; Accept-Language only offers a
  "view in …" chip, as Google recommends. `<html lang>` is the page language.
- Metadata from `lib/seo.ts`: title "{name} — {type} in {place} — book direct" (≤ 60), description
  (≤ 155), canonical to the custom domain when set, hreflang for all five plus x-default, Open Graph
  and Twitter cards from the gallery (1200 px through the site's image optimiser), Search Console
  `google-site-verification` from the owner.
- JSON-LD (`lib/jsonld.ts`): LodgingBusiness (@id, address, geo, map, amenities, rating, latest
  reviews, rooms), HotelRoom with a nightly Offer, BreadcrumbList on every page.
- `/sitemap.xml` per host (every indexable page × 5 languages with xhtml:link alternates, lastmod)
  and `/robots.txt` (booking, guide and review links disallowed).
- Local content (`site_content`): "how to get here" (Location), "things to do nearby" (Things to do,
  formerly /experiences), "best time to visit" (home), plus translations of the property and room
  descriptions. Owners write them, or draft all of it with one Claude call (`CONTENT_MODEL`,
  structured output, prompt caching, 3 drafts a month, `ai_site_content` flag on Pro and up);
  everything AI-written is a draft until the owner publishes it. Owner app: Setup → Google & local
  guide.
- Fonts: Sinhala (Abhaya Libre, Noto Sans Sinhala) and Devanagari (Noto Sans Devanagari) load only on
  pages that contain those letters.

**Marketing site (staydirect.lk, English and Sinhala)**
- Home, pricing (plans from `PLAN_PRICING`, savings calculator), Booking.com commission alternative,
  six area pages (Mirissa, Weligama, Ella, Arugam Bay, Kandy, Sigiriya), FAQ with FAQPage JSON-LD,
  `/blog` with 12 guides for owners (Article JSON-LD), and an example case study that stays noindex
  and out of the sitemap until a real pilot replaces it.
- All static, from Markdown in `apps/web/content/marketing/{en,si}/`; facts are sourced and linked.

**Launch:** `docs/seo-launch-checklist.md` (StayDirect once, each owner at launch, first backlink
targets). Lighthouse reports: `docs/lighthouse/seo/` (guest site, en and de) and
`docs/lighthouse/marketing/`.
