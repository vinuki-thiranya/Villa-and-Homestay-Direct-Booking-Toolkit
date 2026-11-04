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
| `apps/mobile` | Flutter owner app (Release 2). |
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

## Deploy

See spec §11 and [docs/plan.md §4–5](docs/plan.md). In short: API and workers on Fly.io Singapore (`fly.toml`,
`apps/api/Dockerfile`, migrations run as the release command), web on Vercel Pro with `*.staydirect.lk`,
Postgres on Supabase Singapore, Redis on Upstash, photos and slips on Cloudflare R2.
