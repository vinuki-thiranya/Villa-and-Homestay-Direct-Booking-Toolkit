# StayDirect LK: go-live checklist

This takes StayDirect from the repo to live production: the API and worker on Fly.io in Singapore, the guest sites, owner app and marketing site on Vercel, and Postgres on Supabase in Singapore. It follows spec §11 and the account list in [plan.md §5](plan.md). The SEO steps for launch day are in [seo-launch-checklist.md](seo-launch-checklist.md).

Deploys are automatic once this is done. A push to `main` runs CI. If CI passes, [deploy.yml](../.github/workflows/deploy.yml) deploys the API first, because Fly runs the migrations before it starts the new machines. Then it deploys the web app and checks both. Until the secrets in §6 exist, the deploy jobs are skipped with a notice.

Vendor screens change. If a step below doesn't match what you see, follow the vendor's current docs.

---

## 1. Accounts

Start the slow ones first.

- [ ] **Meta Business verification and WhatsApp Cloud API** take 2–10 days, and each template takes 1–2 days. When the number is connected, submit the templates with `npm run whatsapp:templates -w @staydirect/api`.
- [ ] **`staydirect.lk`** from the LK Domain Registry takes 1–3 working days for the document check.
- [ ] **Notify.lk sender ID**, for owner sign-in codes, takes 1–2 days.
- [ ] **Accounts that take minutes:**
  - Supabase: Singapore region, Pro plan before the first paying owner, for point-in-time recovery.
  - Fly.io: needs a card.
  - Vercel: Pro plan, for `*.staydirect.lk`.
  - Cloudflare: DNS and R2.
  - Upstash Redis.
  - Resend.
  - Sentry.
  - Google Maps Platform.
- [ ] **Google Play developer account**, for the owner Android app: 1–3 days for identity checks.

## 2. Database (Supabase)

- [ ] Create the project in **Singapore**. Copy the **session pooler** connection string; this becomes `DATABASE_URL`.
- [ ] Turn on daily backups and point-in-time recovery (Pro plan).
- [ ] Don't run the migrations by hand. The first Fly deploy runs them through `release_command` in `fly.toml`.
- [ ] After the first deploy, add yourself as a platform admin so you can use `admin.staydirect.lk`. In the Supabase SQL editor:
  ```sql
  insert into platform_admin (phone, name) values ('+9477…', 'Your name');
  ```
- [ ] Never run `npm run db:seed` against production. It creates demo tenants.

## 3. API and worker (Fly.io)

- [ ] `fly auth login`, then `fly apps create staydirect-api`. The app name is the one in `fly.toml`.
- [ ] Set every secret listed at the top of [fly.toml](../fly.toml) with one `fly secrets set …`:
  - `JWT_SECRET` and `ENCRYPTION_KEY`: 32 random bytes each, base64 (`openssl rand -base64 32`).
  - `REVALIDATE_SECRET`: a long random string. It must match the web app's value (§4).
  - `SENTRY_DSN`: from §5.
  - `OPS_EMAIL`: the inbox for the daily ops email.
  - Every other secret comes from its provider's dashboard.
- [ ] Run `fly deploy` once by hand from the repo root, and watch `release_command` apply `0001_core.sql` to the latest migration.
- [ ] Run `fly certs add api.staydirect.lk`, then add the DNS records it prints at Cloudflare with the proxy off.
- [ ] Check that `curl https://api.staydirect.lk/health` returns `{"ok":true,"db":"ok"}`. A `503` means the database is not reachable.
- [ ] Check that both process groups (`app` and `worker`) are running in `fly status`. The worker runs the iCal sync, holds, messages, billing, the privacy retention and the ops email.

## 4. Web app (Vercel)

- [ ] Import the GitHub repo into Vercel and set **Root Directory** to `apps/web`. Leave the build command at its default.
- [ ] Turn **off** automatic Git deployments for `main`, because GitHub Actions deploys after CI passes. Preview deployments for branches can stay on.
- [ ] Add these environment variables for Production. Each line names the API variable it must match, where there is one:
  - `API_URL=https://api.staydirect.lk`
  - `NEXT_PUBLIC_API_URL=https://api.staydirect.lk`
  - `ROOT_DOMAIN=staydirect.lk`
  - `OWNER_HOST=app.staydirect.lk`
  - `ADMIN_HOST=admin.staydirect.lk`
  - `REVALIDATE_SECRET` (the same as the API's)
  - `SENTRY_DSN` (the web project's DSN)
  - `SENTRY_ENVIRONMENT=production`
- [ ] Add the domains `staydirect.lk`, `www.staydirect.lk`, `app.staydirect.lk`, `admin.staydirect.lk` and `*.staydirect.lk`.
  - Check Vercel's current wildcard-domain docs before choosing DNS. Vercel has required its own nameservers for wildcard certificates. If it still does, the zone moves from Cloudflare to Vercel DNS. The plan.md §4 fallback is Cloudflare Pages.
- [ ] Owners' own domains: the owner adds a CNAME to `cname.vercel-dns.com`, and you add the domain to the Vercel project. The API does not register domains yet; plan.md §4 lists it as later work.

## 5. Monitoring

- [ ] **Sentry:** create two projects, Node.js for the API and Next.js for the web.
  - Put the DSNs in Fly (`SENTRY_DSN`) and Vercel (`SENTRY_DSN`).
  - Add an alert rule that emails you on every new issue.
  - Only server errors are sent. Request bodies, cookies, auth headers, query strings and log lines are removed before sending (`apps/api/src/instrument.ts`, `apps/web/src/instrumentation.ts`).
- [ ] **Uptime:** an external monitor checks every minute and alerts you on WhatsApp, Telegram or email.
  - Check `https://api.staydirect.lk/health` and one pilot guest site, for example `https://villa-x.staydirect.lk/`.
  - Spec §11 suggests Uptime Kuma, which needs its own server. Any hosted monitor does the same job.
- [ ] **Daily ops email:** with `OPS_EMAIL` set, the worker sends a summary every 24 hours. It lists:
  - failing iCal feeds and open double-booking conflicts;
  - failed messages, OTA errors and failed background jobs;
  - billing and support items;
  - new bookings;
  - what the privacy retention job removed.

  The subject says "all clear" or how many items need attention.

## 6. Turn on automatic deploys (GitHub)

- [ ] **Repository secrets** (Settings → Secrets and variables → Actions):
  - `FLY_API_TOKEN`: from `fly tokens create deploy -a staydirect-api`.
  - `VERCEL_TOKEN`: a Vercel access token.
  - `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`: run `npx vercel link` in the repo root once and read `.vercel/project.json`. Don't commit that folder; it is in `.gitignore`.
- [ ] Optionally, protect the `production` environment so a deploy waits for your approval.
- [ ] Push a small change to `main`. Then check that CI goes green, Deploy runs `api` → `web` → `smoke`, and both health checks pass.

## 7. Backups: restore drill (monthly, and once before launch)

The drill is in [restore-drill.ts](../apps/api/scripts/restore-drill.ts). CI also runs it on every push against the seeded test database, so the script itself stays working.

- [ ] In Supabase, restore the latest backup **into a new project**. Never restore over production.
- [ ] From your laptop:
  ```sh
  SOURCE_DATABASE_URL=<production> TARGET_DATABASE_URL=<restored project> COMPARE_ONLY=1 npm run restore-drill -w @staydirect/api
  ```
  - Compare mode copies no data.
  - It checks that the restore has the latest migration, every table, data in every table that has data, row-level security, every policy, the append-only money triggers, and a working booking query.
- [ ] Write the date and the result in your ops notes, then delete the scratch project.
- [ ] If your plan cannot restore into a new project, use dump mode instead. It needs the PostgreSQL 17 client tools.
  - Run it without `COMPARE_ONLY` and point `TARGET_DATABASE_URL` at an empty database.
  - This copies guest data onto that machine, so use an encrypted disk and drop the database afterwards.

## 8. Guest privacy (GDPR and Sri Lanka PDPA)

- [ ] **Privacy notice:** every guest site links to it from the footer (`/privacy`, in all five languages). It names the owner as controller and StayDirect as processor, says where data is stored, how long it is kept, guests' rights, and which cookies are used.
- [ ] **Cookies:** guest sites set only two preference cookies.
  - `sd_glang` keeps the language the guest picked.
  - `sd_cur` keeps the currency. A currency guessed from the visitor's country lasts only for the browser session; one the guest picks is kept for a year.
  - There are no analytics, advertising or tracking cookies, so no consent banner is needed. **If analytics is ever added, a consent banner has to come with it.**
- [ ] **Guest requests:** owners handle them in the owner app under Guests → *guest* → Privacy.
  - **Download their data** gives a JSON file to send to the guest.
  - **Delete personal data** is for owners only. Payments and invoices stay for 7 years by law.
  - Erasing a guest with a booking that hasn't ended is refused.
- [ ] **Retention runs by itself every day:**
  - guest messages are deleted after 24 months;
  - guests are anonymised 36 months after their last stay, unless the owner ticked "Keep as a repeat guest".
  - Deleting money records after 7 years is not built yet. The first ones fall due in 2033.

## 9. Before the first real guest

- [ ] Payments: run a live **LKR 100** payment through PayHere, PayPal and LankaQR or bank transfer for each of 3 pilot properties, then refund it (spec §9 launch checklist).
- [ ] **On a real phone over 4G:** open a pilot's guest site, book, pay the deposit, and receive the email and WhatsApp confirmation. Then check that:
  - the booking appears in the owner app;
  - the nights show as blocked on Airbnb after its next iCal import.
- [ ] TLS works on every domain: `staydirect.lk`, `app.`, `admin.`, `api.`, a pilot subdomain and any custom domain.
- [ ] `PAYHERE_SANDBOX` and `PAYPAL_SANDBOX` are `false` in `fly.toml`, and each owner's gateway is in live mode.

## Spec §9 launch checklist: where each item stands

| Item | Status |
|---|---|
| 40 property interviews summarised | Yours: field work |
| 10 pilot sites live with iCal verified | Built: guest sites, iCal export and import with conflict alerts. Each pilot needs onboarding. |
| PayHere, PayPal and LankaQR test payments for 3 pilots | Built. Run the live LKR 100 tests in §9. |
| WhatsApp templates approved in EN/DE/FR/HI | Built: `npm run whatsapp:templates` submits them. Waiting on Meta's approval. |
| GDPR privacy notice and cookie banner | Done: privacy notice on every guest site. No banner needed (§8). |
| Reception desk cards printed | Yours |
| Case-study numbers tracked from day 1 | Built: the owner dashboard shows revenue by source and commission saved. The marketing case study stays a noindex template until a pilot's real numbers replace it. |
