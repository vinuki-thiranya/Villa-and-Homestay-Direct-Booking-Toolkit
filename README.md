# StayDirect LK

Direct-booking and operations toolkit for 2–15-room villas, guesthouses, homestays and surf camps in Sri Lanka:
a fast booking site per property, a calendar that stays in sync with Airbnb and Booking.com over iCal, deposits through
PayHere, PayPal, LankaQR or bank transfer under the **owner's own** merchant accounts, and an owner dashboard.

- Product spec: [docs/spec.md](docs/spec.md)
- Engineering plan (phases, schema decisions, routing, accounts, top-20 risks): [docs/plan.md](docs/plan.md)
- Rules for contributors and Claude Code: [CLAUDE.md](CLAUDE.md)

## Monorepo

| Path | What |
|---|---|
| `apps/api` | NestJS 12 REST API + workers (iCal sync every 15 min, hold sweeper, follow-ups, FX). SQL migrations in `apps/api/migrations`. |
| `apps/web` | Next.js 16: guest sites (`*.staydirect.lk`, custom domains), owner web (`app.staydirect.lk`), marketing site. |
| `apps/mobile` | Flutter owner app: Today, Tasks, Inbox, offline viewing. |
| `packages/shared` | Types, zod schemas, pricing engine, currency and date helpers shared by API and web. |

## Run it locally (no Docker needed)

Requires Node 22+.

```bash
npm install
npm run build:shared

# terminal 1 — embedded Postgres on :54329 (data in apps/api/.pgdata)
npm run db:local

# terminal 2 — schema + demo villa (6 rooms), then the API on :4000
cp apps/api/.env.example apps/api/.env      # set JWT_SECRET
npm run db:migrate && npm run db:seed
npm run dev:api

# terminal 3 — web on :3000
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
```

- Guest site: http://villa-lagoon.localhost:3000 (or http://localhost:3000/s/villa-lagoon)
- Owner web: http://localhost:3000/owner — phone `0770000000`, code `123456` (`OTP_DEV_CODE`, console SMS only)
- Room iCal export: shown under *Channels* in the owner web (`/ical/{token}.ics` on the API)

Without `RESEND_API_KEY`, `WHATSAPP_TOKEN` or Notify.lk credentials, emails, WhatsApp alerts and OTP SMS are printed
to the API log instead of being sent. Without `REDIS_URL` the recurring jobs run inside the API process.

To use Supabase instead of the embedded database, put the Singapore project's session-pooler URI in `DATABASE_URL`
and run `npm run db:migrate`.

Release 2 (WhatsApp inbox, AI concierge, housekeeping, add-ons, reviews, CRM) is described in [docs/plan.md §7](docs/plan.md);
Release 3 (team access, manager companies and owner statements, white label, long stays and invoices, OTA adapter,
commission ledger, admin console) in [§8](docs/plan.md).

Demo logins (dev OTP `123456`): owner `0770000000` (Villa Lagoon, Pro, simulated OTA connection), caretaker company
`0770000001` (Manager plan, two owners and properties, white label), limited manager `0770000002`, StayDirect admin
`0770000099` at `/admin`.
The owner web and app also run in Sinhala: tap **සිං** in the owner header (or More → Language); the choice follows the user to the Flutter app.
Set `ANTHROPIC_API_KEY` and switch the concierge on under *Setup → Concierge* to try it; without a key, guest messages land in the inbox only.

Guest sites come in English, Sinhala, German, French and Hindi, each at its own URL: `villa-lagoon.localhost:3000/de/rooms`
or `localhost:3000/s/villa-lagoon/hi`. The marketing site is at `localhost:3000/` and `localhost:3000/si`. Owners write
(or draft with AI, which needs `ANTHROPIC_API_KEY`) the local guide and translations under *Setup → Google & local guide*;
nothing is public until they publish it. SEO details: [docs/plan.md §10](docs/plan.md); launch steps:
[docs/seo-launch-checklist.md](docs/seo-launch-checklist.md).

## Tests

```bash
npm test
```

Integration tests run against a real Postgres 17 (embedded automatically, or `TEST_DATABASE_URL`) because the
guarantees under test live in the database:

- two concurrent requests cannot reserve the same night (and twenty overlapping ones produce one winner);
- an expired hold releases its nights, with or without the sweeper;
- a 1,000-request season simulation never double-sells a night;
- PayHere notifies are signature-verified and idempotent; a payment that arrives after the nights were resold is flagged for refund;
- iCal import adds/releases OTA nights, records conflicts with direct bookings, and never releases nights on a failed fetch;
- RLS hides other tenants' rows; payment rows are append-only.
- Release 3: managers limited to their properties by RLS, invite links, plan flags and overrides, the OTA adapter (trigger-queued availability push, OTA booking import, closed dates refused, races recorded as conflicts, cancellations, idempotent revisions), monthly long-stay pricing with metered utilities and numbered append-only invoices, owner statement payout maths and re-issue, the commission ledger, provider auto-removal, admin/tenant token separation, locked template translations, white label.
- Release 4: the guest-site calendar (closed only when every room is taken), trust facts (median first reply, review summary), the confirmation message text, duplicate manual payment references refused with 409.
- Web unit tests (`apps/web`): every theme palette meets WCAG AA in light and dark, owner brand colours get readable button text, inlined theme CSS only accepts validated values, currency detection, payment grouping by guest type, date-range rules.
- Release 2: WhatsApp webhook signatures and duplicates, the 24-hour window, the AI concierge with a stubbed model (tool use, fallbacks, never books, escalation, monthly budget), discount codes, add-on commission split and job cards, review routing, repeat-guest codes, sequence send hours, the daily task board and the cleaner link; WhatsApp templates checked against Meta's rules.

### Guest site: screenshots and Lighthouse

With the API and seed running:

```bash
cd apps/web
npm run dev                                        # or a production build, see below
OUT=./screenshots npm run screenshots              # 375 px, every theme, a real booking through to confirmation
npm run build && ALLOW_THEME_PREVIEW=1 npx next start --port 3100
WEB=http://localhost:3100 RUNS=5 OUT=../../docs/lighthouse npm run lighthouse
```

`?previewTheme=lagoon|jungle|surf` renders any guest site in another theme (dev, or `ALLOW_THEME_PREVIEW=1`).
CI runs both on every push (job `guest-site`) and uploads the screenshots and reports.

## Deploy

See spec §11 and [docs/plan.md §4–5](docs/plan.md). In short: API and workers on Fly.io Singapore (`fly.toml`,
`apps/api/Dockerfile`, migrations run as the release command), web on Vercel Pro with `*.staydirect.lk`,
Postgres on Supabase Singapore, Redis on Upstash, photos and slips on Cloudflare R2.
