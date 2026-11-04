# CLAUDE.md

StayDirect LK — direct-booking and operations SaaS for 2–15-room villas and homestays in Sri Lanka.
Start every session by reading this file, [docs/spec.md](docs/spec.md) (product) and
[docs/plan.md](docs/plan.md) (engineering decisions). Name the app you are working in.

## Layout
- `apps/api` — NestJS REST API and BullMQ workers (`src/main.ts`, `src/worker.ts`). SQL migrations in `apps/api/migrations`.
- `apps/web` — Next.js 16 App Router: guest sites (`/s/[site]`), owner web (`/owner`), marketing (`/`). Host routing in `src/proxy.ts`.
- `apps/mobile` — Flutter owner app (not started).
- `packages/shared` — types, enums, zod schemas, pricing/date helpers shared by api and web. Build it before the apps (`npm run build -w @staydirect/shared`).

## Commands
- `npm install` — all workspaces.
- `npm run db:local` — start an embedded Postgres on :54329 for dev (no Docker needed).
- `npm run db:migrate` / `npm run db:seed` — apply migrations / load the 6-room demo property (uses `DATABASE_URL`).
- `npm run dev:api`, `npm run dev:worker`, `npm run dev:web`.
- `npm test` — shared unit tests + API integration tests (embedded Postgres unless `TEST_DATABASE_URL` is set).

## Non-negotiable rules
1. **Inventory changes only inside transactions.** Any write to `night_inventory` or `hold` goes through `InventoryService` within `db.tx()`. Never write availability from a controller.
2. **The database refuses double sales.** The unique index on active nights (`held`, `reserved`, `blocked`) is the guard; do not replace it with application checks. Catch `23505` and turn it into a 409.
3. **Money rows are append-only.** `payment`, `commission_ledger`, `audit_log` are never updated in amount or deleted; refunds and reversals are new (negative) rows. A DB trigger enforces this — do not drop it.
4. **Webhooks are verified and idempotent.** Verify the provider signature (PayHere `md5sig`, PayPal server-side capture/verify) before reading the body, and record `(provider, event_id)` in `webhook_event` in the same transaction as the effect.
5. **Only a confirmed payment changes a booking to `confirmed`.** No UI, AI or owner action may confirm a direct booking without a payment row (cash/bank confirmations create one).
6. **We never hold guest money.** Gateways run on the owner's merchant credentials (`property.gateway_config`, AES-GCM encrypted). Never log decrypted credentials or card data.
7. **Tenant isolation.** Owner/manager requests use `db.withTenant(tenantId, …)` so RLS applies. Public guest endpoints return explicit public projections only — never `select *` to the guest site.
8. **Stay dates are `date` in property-local time**; timestamps are `timestamptz`. Money is `numeric(12,2)`; do maths in integer minor units (`packages/shared/src/money.ts`).
9. **Guest pages under 2 s on 4G.** Static/ISR property pages, availability fetched client-side, images ≤ 150 KB via `next/image`, self-hosted fonts, no heavy client libraries on first view. WCAG AA basics.
10. **UI work uses the frontend-design and UI UX Pro Max skills** (and Framer Motion on guest sites) when available.
11. Every migration touching `night_inventory`, `booking` or `payment` is flagged in the PR description for human review.

## Conventions
- API modules live in `apps/api/src/modules/<name>/`; SQL is written by hand with `pg` (`DbService.query/tx/withTenant`), no ORM.
- Request validation with zod schemas from `@staydirect/shared` via `ZodPipe`.
- Errors: throw Nest HTTP exceptions; never leak SQL errors to clients.
- Tests that need Postgres live in `apps/api/test/*.int.test.ts`; pure logic is unit-tested next to the code.
