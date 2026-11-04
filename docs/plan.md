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
| `staydirect.lk`, `www.staydirect.lk` | marketing pages (`/`) |
| `app.staydirect.lk` | `/owner/*` |
| `{slug}.staydirect.lk` | `/s/{slug}/*` |
| anything else (custom domain) | `/s/{host}/*` → page resolves `property.custom_domain = host` |
| local dev | `villa-lagoon.localhost:3000` works natively; `/s/villa-lagoon` also reachable directly |

**Deployment:** Vercel Pro (wildcard `*.staydirect.lk` needs Pro; DNS on Cloudflare with
`*.staydirect.lk CNAME cname.vercel-dns.com`, proxy off). Custom domains: owner adds a CNAME to
`cname.vercel-dns.com`; we register it via the Vercel Domains API (Phase 3) and Vercel issues TLS.
Cloudflare Pages is the fallback if Vercel Pro is not wanted (free wildcards via Workers routes).

**Cache strategy for guest pages:**
- Property data is fetched through Next's data cache (`revalidate: 300`, tags `site:{slug}` /
  `site:{custom_domain}`); the API calls `/api/revalidate` on any owner edit, so changes show within seconds.
  Phase 1 renders guest pages per request from that cache; full static prerendering per site (plus
  `generateStaticParams` for live sites) is part of the Prompt 6 performance pass.
- Availability and prices are never in the page HTML: the client calls the API, which caches a
  search for 60 s keyed by (room set, dates, guests) and invalidates on any inventory write.
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
