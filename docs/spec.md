# Project 3 — Direct-Booking and Operations Toolkit for Villas and Homestays

Oct 27, 2026 · @bech

## 1. Executive summary

A SaaS that gives a 2–15-room villa, guesthouse, homestay or surf camp its own direct-booking website, keeps its calendar in sync with Booking.com and Airbnb, takes deposits in LKR or USD, answers guests on WhatsApp, and runs housekeeping. Target: 100 properties at LKR 10,000/month plus add-on commissions reaches LKR 1M/month in 12–18 months, on LKR 150K–300K of startup cost.

Working name: "StayDirect LK" or a coastal brand like "Kabook" (from කබුක්, a playful take). Check .lk and .com availability.

The problem today: a small owner in Mirissa or Ella pays 15–18% commission on every OTA booking, double-books because Airbnb and Booking.com calendars are updated by hand, answers the same WhatsApp questions 40 times a week, and manages cleaners with phone calls. Global tools (Lodgify, Hostaway, Cloudbeds, Little Hotelier) cost USD 40–200+ a month, bill in USD by card, and do not know LankaQR, PayHere, Sri Lankan drivers or the SLTDA registration form.

What the product does: one owner app (web and Android) and one guest-facing booking site per property. Direct bookings pay a 2.49–2.99% gateway fee instead of 15–18%. iCal sync prevents double bookings. A WhatsApp concierge answers guests in English, Hindi, German and French. Cleaners get a task list. An add-on marketplace (airport pickup, driver, safari, surf lesson, cooking class) earns the owner and you a commission.

Why now:
- 1.69 million tourists arrived in January–September 2026; India is 25.8% of arrivals and pays through UPI on LankaQR; Western guests can now pay by PayPal.
- Tourism earnings per visitor are under pressure (−11.5% in Jan–Jul 2026), so owners are more sensitive to commission than ever.
- Thousands of small properties on the South coast, Ella, Kandy, Sigiriya and Arugam Bay are owner-run, under-digitized, and reachable by one road trip.
- The February 2026 Digital Nomad Visa creates demand for monthly stays that OTAs handle poorly.

Revenue model in one line: property subscription (LKR 5,000–15,000/month) + 2–3% of direct-booking value (optional, instead of subscription) + 10–15% commission on add-on experiences.

Beachhead: 20 properties between Weligama and Tangalle, signed in person over two weeks, then Ella and Arugam Bay.

## 2. Target customers, property types and market

The buyer is the owner or the manager of a small property; the daily users are the manager, the cleaner and the guest. Design the owner app for a phone in a pocket on the beach, and the guest site for a tourist on a 4G connection in Europe.

### Customer segments

| Segment | Rooms | Typical ADR (USD) | Pain that converts | Plan |
|---|---|---|---|---|
| Homestay / family guesthouse | 2–5 | 15–40 | Commission bite, WhatsApp overload, no website | Basic |
| Boutique villa or surf camp | 4–10 | 40–120 | Double bookings, deposits for direct guests, add-on sales | Pro |
| Small hotel or multi-villa operator | 8–15 per property, 2–5 properties | 60–200 | Multi-property calendar, staff tasks, reporting, long-stay nomads | Pro Multi |
| Property manager / caretaker companies | 5–30 properties managed for absent owners | varies | Owner reporting, payout statements, task tracking | Manager |

### User roles

| Role | Device | Core jobs |
|---|---|---|
| Owner | Android app + web | Set rates and availability, approve bookings, see revenue, pay subscription |
| Manager | Android app + web | Handle enquiries, check-in/out, assign tasks, confirm payments |
| Cleaner / staff | Android app (simple task view) or WhatsApp | See today's rooms, mark done, upload photos |
| Guest | Booking site (mobile web), WhatsApp | Check availability, book, pay deposit, get directions, order add-ons, leave review |
| Add-on provider (driver, guide) | WhatsApp only | Receive job, confirm, get paid |

### Market size (directional)
- SLTDA lists tens of thousands of registered rooms in guesthouses, homestays and bungalows; many more are unregistered. Field counts: Mirissa–Weligama alone has several hundred small properties within 5 km of the beach.
- If 3,000 properties in the top 8 tourist clusters are candidates and you win 5%, that is 150 properties, well past the 100 needed for LKR 1M/month.
- Direct-booking value: a 6-room villa at USD 60 ADR and 60% occupancy takes about USD 6,500 a month; if 30% moves to direct, that is USD 1,950 a month on which a 2.5% fee is about USD 49 (LKR 16,000), more than the subscription.

### Source-market fit
- India (25.8% of arrivals): UPI via LankaQR, Hindi concierge replies, family rooms and veg meal add-ons.
- UK, Germany, France, Australia: PayPal and cards, English/German/French replies, airport transfer and surf/safari add-ons.
- Digital nomads: monthly rates, Wi-Fi speed test shown on the listing, invoice for visa renewal.

### Competition
- OTAs: Booking.com, Airbnb, Agoda, MakeMyTrip. You do not replace them; you sync with them and shift repeat and referral guests to direct.
- Global PMS/channel managers: Lodgify, Hostaway, Guesty, Cloudbeds, Little Hotelier, Smoobu. USD-priced, card-billed, no local payments or add-ons.
- Local web agencies: one-off WordPress sites with no calendar sync.
- Free stack: WhatsApp + Google Calendar + a Facebook page.

Your edge: LKR pricing paid by LankaQR, PayHere and PayPal checkout for guests, WhatsApp-first concierge, local add-on marketplace, SLTDA compliance help, and onboarding done at the property.

## 3. Full feature specification

Three releases: MVP (booking site, calendar, iCal sync, deposits, WhatsApp enquiries), Release 2 (AI concierge, housekeeping, add-on marketplace, reviews), Release 3 (multi-property, manager accounts, reporting, long-stay tools, direct API connections to OTAs).

### 3.1 Property setup and listing
- Property profile: name, type, address with map pin, photos (auto-compressed, max 30), description in English with AI-assisted translations to German, French, Hindi. [MVP]
- Rooms and units: name, max guests, beds, bathroom, amenities, base rate, extra-guest rate, min and max nights. [MVP]
- Rate plans: seasonal rates (high season Dec–Mar and Jul–Aug on the South coast; Arugam Bay May–Sep), weekend rates, long-stay discounts (7+, 28+ nights), last-minute discounts. [MVP]
- House rules, check-in/out times, cancellation policy templates (flexible, moderate, strict). [MVP]
- SLTDA registration helper: checklist of documents, form pre-filled from the profile, renewal reminder. [R2]

### 3.2 Direct-booking website
- One site per property at name.yourbrand.lk with custom-domain option; mobile-first; loads under 2 seconds on 4G. [MVP]
- Pages: home, rooms, gallery, location and how to get here, experiences, reviews, contact, book. [MVP]
- Availability search by dates and guests, live from the calendar; instant book or request-to-book per room. [MVP]
- Price shown in USD, EUR, GBP, INR and LKR using daily rates; the owner chooses the settlement currency. [MVP]
- Checkout: guest details, special requests, deposit payment (see Section 4), confirmation email and WhatsApp with directions, Google Maps link and host's WhatsApp. [MVP]
- SEO basics: structured data for lodging, sitemap, fast images, a Google Business Profile link. [MVP]
- Themes: 3 clean templates; owner edits text and photos only. [MVP]

### 3.3 Calendar and channel sync
- Unified calendar per room: direct bookings, OTA bookings, blocks and maintenance. [MVP]
- iCal import/export for Airbnb, Booking.com, Agoda, Vrbo; sync every 15 minutes with a manual "sync now". [MVP]
- Conflict detection: if two channels book the same night, alert the owner immediately by WhatsApp with one-tap actions. [MVP]
- Direct API channel manager for Booking.com and Airbnb (rates and availability both ways) via a connectivity partner. [R3]
- Minimum-stay and closed-to-arrival rules applied across channels. [R3]

### 3.4 Enquiries and WhatsApp concierge
- A WhatsApp number per property (or the owner's existing number via Cloud API) with an inbox in the owner app. [MVP]
- Quick replies in English, German, French, Hindi for the top 30 questions (directions, check-in, Wi-Fi, breakfast, transport, surf conditions, ATM, pharmacy). [MVP]
- AI concierge (Release 2): answers from the property's knowledge base; quotes availability and price; sends a booking link; escalates to the manager with a summary; never confirms a booking without payment. [R2]
- Pre-arrival sequence: 7 days before (how to get here), 1 day before (check-in details), on arrival (Wi-Fi, house guide), mid-stay (add-ons), check-out (review request). [R2]
- Guest house guide: a web page per property with Wi-Fi, rules, restaurants, emergency numbers, in the guest's language. [R2]

### 3.5 Payments and deposits (details in Section 4)
- Deposit rules: percentage or fixed amount per rate plan; balance at check-in or 7 days before. [MVP]
- Gateways: PayHere (cards, Genie, FriMi), LankaQR (UPI for Indian guests), PayPal (international guests), bank transfer with slip upload. [MVP]
- Automatic reminders for unpaid balances; cancellation handling per policy; refund workflow. [MVP]
- Receipts and invoices with the property's SLTDA number and tax lines. [MVP]

### 3.6 Housekeeping and operations
- Daily task board: check-outs to clean, check-ins to prepare, maintenance issues. [R2]
- Cleaner app or WhatsApp list: tap to mark done, upload photos; manager sees status. [R2]
- Inventory and shopping list for breakfast supplies and toiletries (simple counts). [R3]
- Maintenance log with photos and cost. [R2]
- Staff shifts and a simple attendance log for the owner. [R3]

### 3.7 Add-on marketplace
- Catalogue per property: airport pickup, driver day hire, tuk-tuk rental referral, surf lesson, whale watching, safari (Yala, Udawalawe), cooking class, laundry, bicycle. [R2]
- Providers (drivers, guides) are onboarded by the owner or by you; each add-on has a price, provider WhatsApp and commission split. [R2]
- Guests order from the booking site or via the concierge; the provider receives a WhatsApp job card; payment collected with the stay or on the day; commission settled monthly. [R2]
- Ratings for providers; auto-remove below 4.0. [R3]

### 3.8 Reviews and repeat guests
- Post-stay review request with a link to Google and to the property site; private feedback routed to the owner first. [R2]
- Guest CRM: past guests with stay history; a "book direct next time, 10% off" code sent 11 months later. [R2]

### 3.9 Reporting
- Owner dashboard: occupancy, ADR, revenue by channel, commission saved versus OTA, upcoming arrivals, unpaid balances. [MVP]
- Monthly PDF statement; export to Excel. [MVP]
- Manager accounts for caretaker companies with per-owner statements and payout calculation. [R3]

### 3.10 Long-stay and nomad tools
- Monthly rate plans with utilities included or metered; invoice suitable for Digital Nomad Visa renewal. [R3]
- Wi-Fi speed badge on the listing (owner runs a test monthly). [R2]

### 3.11 Your admin console
- Tenant list, plan, sync health, gateway status, add-on commissions owed, support tickets. [MVP]
- Feature flags, template editor, translation management. [MVP]

### 3.12 Platform-wide requirements
- Owner app works offline for viewing today's arrivals and tasks. [R2]
- Guest site accessible (WCAG AA basics), fast, and indexable. [MVP]
- All money actions logged and reversible by entry, never by deletion. [MVP]
- Data stored in Singapore region; GDPR-compliant handling for EU guests (privacy notice, deletion on request). [MVP]

## 4. Booking, payment and channel-sync flows

The booking engine must never sell a night twice and must never hold money it cannot refund. Both rules are enforced in the database, not only in the UI.

### 4.1 Direct booking flow
- Guest searches dates and guests on the property site; the API returns available rooms with prices computed from rate plans, taxes and currency.
- Guest selects a room and enters details; the API creates a booking in status pending and places a 15-minute hold on the nights (a database row with expiry; availability queries exclude active holds).
- Guest pays the deposit through the chosen gateway (Section 4.3). On a successful webhook the booking moves to confirmed, the hold is converted to reserved nights, and the calendar exports update so OTAs block the dates within 15 minutes.
- Confirmation email and WhatsApp are sent in the guest's language with the house guide link, balance due and cancellation policy.
- If payment fails or the hold expires, the booking becomes abandoned and the nights are released; the guest gets a "still want these dates?" message after 1 hour.
- Request-to-book mode: the owner approves within 12 hours; the hold is extended to 12 hours; approval triggers the payment link.

### 4.2 Availability and conflict rules
- Nights are stored as rows in night_inventory (room, date, status, source, booking_id). A unique constraint on (room_id, date) where status is reserved makes a double booking impossible at the database level.
- OTA bookings arrive by iCal (date ranges, no guest details) and are written as reserved nights with source airbnb or booking_com. If the write collides with a direct reserved night, the conflict is logged and the owner is alerted with the booking references on both sides and a suggested action (cancel direct and refund, or ask the OTA to relocate).
- Minimum-stay, closed-to-arrival and closed-to-departure rules are evaluated at search time and again at hold time.
- Buffers: optional 1-night gap after each stay for deep cleaning, applied per room.

### 4.3 Payment methods

| Guest type | Method | Flow | Fee (indicative) | Settles to |
|---|---|---|---|---|
| International card | PayHere (Visa/Mastercard, USD-priced, LKR-settled) or PayPal | Hosted checkout; webhook confirms | PayHere 2.49–2.99%; PayPal about 4.4% | Owner's LKR bank (PayHere) or owner's PayPal → BOC/ComBank/Sampath |
| Indian guest | LankaQR with UPI | QR shown on the pay page with amount and booking reference; guest scans with any UPI app; owner confirms from bank alert or slip | Fee-free under LKR 5,000, else up to 1% | Owner's bank |
| Sri Lankan guest | PayHere (Genie, FriMi, eZ Cash, mCash, cards) or LankaQR | Hosted checkout | 2.49–2.99% or QR fee | Owner's bank |
| Any guest | Bank transfer / Wise | Instructions shown; slip upload; OCR reads amount and reference; manager confirms | Bank fees only | Owner's bank |
| Walk-in | Cash | Manager marks paid; receipt issued | 0 | — |

Who holds the money: the owner. Every gateway is connected under the owner's own merchant account; you never hold guest funds. This keeps you out of payment-licensing scope and removes refund liability. Your subscription and commissions are billed separately to the owner.

### 4.4 Deposits, balances, cancellations and refunds
- Deposit: default 30% at booking, balance 7 days before arrival (or at check-in for flexible plans). Configurable per rate plan.
- Cancellation policies: Flexible (full refund up to 7 days), Moderate (50% up to 14 days), Strict (deposit non-refundable). The policy text is shown before payment and in the confirmation.
- Refunds: PayHere refund API where available; PayPal refund API; bank transfers refunded manually with a task created for the manager. Every refund is a negative payment row.
- No-shows: marked by the manager; deposit retained per policy; nights released for same-day sale.

### 4.5 Currency
- Rates are set in one base currency (USD or LKR). Display currencies are converted daily from a public rate feed plus a 1.5% buffer.
- The guest sees the charge currency clearly before paying (PayHere charges in LKR; PayPal can charge in USD).
- Invoices show both the charged amount and the base-currency amount.

### 4.6 iCal sync mechanics
- Each room has an export URL (/ical/{room_token}.ics) listing reserved nights and blocks; the owner pastes it into Airbnb and Booking.com.
- Each room stores up to 5 import URLs; a worker fetches every 15 minutes, diffs against the last snapshot, and applies adds and removals as reserved or released nights.
- Sync health per room is shown in the owner app (last successful fetch, errors); 3 consecutive failures alert the owner.
- Known limits of iCal (no guest names, 15-minute lag) are explained in onboarding; Release 3 adds direct API connections through a certified connectivity partner for owners who want real-time two-way sync.

## 5. System architecture and tech stack

A multi-tenant Postgres backend, a server-rendered guest booking site that must be fast and indexable, an owner app, and workers for sync and messaging. Infrastructure at 100 properties: about USD 60–120/month.

### Stack

| Layer | Choice | Why |
|---|---|---|
| Guest booking sites | Next.js with server-side rendering on Vercel (or Cloudflare Pages) with per-tenant routing by subdomain and custom domains | SEO and speed matter for direct bookings; one codebase renders every property |
| Owner and manager app | Flutter (Android first) + the same Next.js app as a PWA for desktop | Owners live on their phones; managers use laptops |
| Cleaner view | Minimal web page opened from a WhatsApp link, no login | Cleaners should not need an account |
| API | Node.js (NestJS) in TypeScript; REST; webhooks for gateways and WhatsApp | Same language across the stack |
| Database | PostgreSQL on Supabase with RLS on tenant_id; night_inventory unique index guards double booking | Correctness lives in the database |
| Workers | BullMQ on Upstash Redis: iCal sync every 15 minutes, messaging sequences, currency refresh, reports | Reliable retries |
| Storage | Cloudflare R2 for photos; image resizing at the edge | No egress fees, fast galleries |
| Messaging | WhatsApp Business Cloud API, Resend for email, local SMS gateway fallback | Guests are on WhatsApp |
| AI concierge | LLM API with retrieval over the property knowledge base; strict tools: check_availability, quote, send_booking_link, escalate | Never confirms without payment |
| Payments | PayHere, LankaQR, PayPal, bank-slip OCR; all under the owner's accounts | You never hold funds |
| Maps and rates | Google Maps embed; open exchange-rate feed |  |
| Monitoring | Sentry, Grafana Cloud, Uptime Kuma; sync-health dashboard per room | Sync failures are the main support cause |
| Hosting | API on Fly.io (Singapore) or Hetzner; DB in Supabase Singapore | Low latency to Sri Lanka and India |

### Multi-tenancy and domains
- A tenant is an owner or a manager company; a tenant has one or more properties; a property has rooms.
- Guest sites resolve by hostname: villa-name.yourbrand.lk by default; custom domains via CNAME with automatic TLS.
- Per-tenant gateway credentials, WhatsApp number and templates, and currency settings.

### Key flows
- Search: guest site calls /availability?property&from&to&guests; API computes free rooms from night_inventory, prices from rate plans, converts currency, caches for 60 seconds.
- Hold and pay: /bookings creates a pending booking and hold inside one transaction; the gateway webhook confirms; nights become reserved; iCal export updates.
- iCal worker: fetch → parse → diff → write nights → detect conflicts → alert.
- Concierge: WhatsApp webhook → load property knowledge and guest thread → LLM with tools → reply or escalate; all outbound messages logged.
- Daily ops: at 6 am a job builds the task board for each property and sends cleaners their list via WhatsApp.

system architecture · 3 zones, 10 components

Every booking, whether from the guest site or an OTA calendar, ends as rows in the night inventory, so the database itself refuses the second sale of any night; money moves only between the guest and the owner's own gateways.

### Performance and reliability
- Guest site first load under 2 seconds on 4G; images under 150 KB each.
- Availability query under 100 ms for a 15-room property over a 365-day window.
- Sync worker completes a cycle for 500 rooms in under 5 minutes.
- Daily backups; point-in-time recovery; monthly restore drill.

### Security and compliance
- Owner auth by phone OTP; manager invites by link; role-based permissions.
- No card data touches your servers (hosted gateway pages only).
- GDPR: privacy notice, data export and deletion per guest; EU guests' data retained 24 months then anonymized.
- Sri Lanka PDPA: same standards applied to Sri Lankan guests and staff data.

## 6. Data model

Every table carries tenant_id; the night_inventory table is the single source of truth for availability; money tables are append-only.

| Entity | Key fields | Relationships and rules |
|---|---|---|
| tenant | id, type (owner, manager_company), name, language, base_currency, plan, billing_status | Owns properties |
| user | id, tenant_id, phone, email, name, role (owner, manager, staff), language | Managers invited by link |
| property | id, tenant_id, name, slug, custom_domain, type, address, lat, lng, sltda_number, sltda_expiry, check_in, check_out, timezone, whatsapp_number, gateway_config (encrypted), theme | Has rooms, rate plans, knowledge entries |
| room | id, property_id, name, max_guests, beds, amenities[], base_rate, extra_guest_rate, min_nights, max_nights, ical_export_token, cleaning_buffer_nights | Has night_inventory rows |
| ical_source | id, room_id, url, channel (airbnb, booking_com, agoda, vrbo, other), last_fetch_at, last_status, snapshot_hash | Up to 5 per room |
| rate_plan | id, property_id, name, room_ids[], start_date, end_date, weekday_mask, rate, deposit_pct, cancellation_policy, min_nights | Overlaps resolved by priority |
| night_inventory | room_id, date, status (free, held, reserved, blocked), source (direct, airbnb, booking_com, manual), booking_id, hold_id | Unique (room_id, date) where status is reserved |
| hold | id, room_id, from_date, to_date, expires_at, booking_id | Expired holds are swept every minute |
| guest | id, tenant_id, name, email, phone, country, language, passport_last4 (optional), notes, stays_count | CRM; merged by email or phone |
| booking | id, property_id, room_id, guest_id, from_date, to_date, guests, status (pending, confirmed, checked_in, checked_out, cancelled, no_show, abandoned), source, base_amount, taxes, add_ons_amount, total, currency, deposit_due, balance_due_date, cancellation_policy_snapshot | Status transitions logged |
| payment | id, booking_id, amount, currency, method (payhere, lankaqr, paypal, bank, cash), gateway_ref, slip_url, status (pending, confirmed, reversed), confirmed_by, confirmed_at | Append-only; refunds are negative rows |
| invoice | id, booking_id, number, pdf_url, issued_at, lines[] | One per booking plus add-ons |
| message | id, property_id, guest_id, channel (whatsapp, email, sms), direction, body, template_id, status, sent_at, read_at, ai_generated | Full thread per guest |
| knowledge_entry | id, property_id, title, body, language, embedding | Used by concierge |
| sequence | id, property_id, trigger (booking_confirmed, pre_arrival_7d, arrival, mid_stay, check_out), template_id, channel, enabled | Automated messages |
| task | id, property_id, room_id, date, type (clean, prepare, maintenance, shopping), assignee_user_id, status, photos[], notes, cost | Daily board |
| add_on | id, property_id, name, category, price, currency, provider_id, commission_pct, platform_pct, lead_time_hours | Catalogue |
| provider | id, tenant_id, name, phone, service_types[], rating, active | Drivers, guides |
| add_on_order | id, booking_id, add_on_id, date, qty, amount, status (requested, confirmed, done, cancelled), provider_notified_at, provider_paid_at | Commission computed from add_on |
| review | id, booking_id, rating, body, public, source, created_at | Private first |
| fx_rate | base, quote, rate, fetched_at | Daily |
| subscription | tenant_id, plan, price, billing_model (flat, pct), started_at, renews_at, status, payhere_subscription_id | Your billing of the owner |
| commission_ledger | id, tenant_id, period, direct_booking_value, pct_fee, add_on_commission, total_due, status, paid_at | Monthly statement to owner |
| audit_log | id, tenant_id, actor, action, entity, entity_id, before, after, at | Money and inventory changes |

### Derived views
- v_availability(room_id, date): free nights after holds, reservations, blocks and cleaning buffers.
- v_owner_dashboard: occupancy, ADR, revenue by source, commission saved (direct revenue × 15%).
- v_sync_health: per room, last fetch and failures.

### Retention
- Guest messages 24 months; guest identity anonymized 36 months after last stay unless the owner marks a repeat guest.
- Financial records 7 years.
- Night inventory kept indefinitely (small).

## 7. Integrations and third-party services

| Service | Purpose | Integration method | Cost model | Fallback |
|---|---|---|---|---|
| PayHere | Guest card and wallet payments in LKR; your subscription billing | Hosted checkout under the owner's merchant ID; webhook; refund API; recurring API for your billing | 2.49–2.99% to the owner; Premium LKR 9,990/month for you only if you bill recurring | Bank transfer |
| LankaQR (via owner's bank) | UPI and local bank-app payments | Static QR per property; amount and booking reference shown; confirm by bank alert or slip OCR | Fee-free under LKR 5,000, up to 1% above | Bank transfer |
| PayPal Business (owner's account) | International guests paying in USD/EUR/GBP | PayPal Checkout buttons with the owner's client ID; webhook; refund API | About 4.4% + fixed fee | PayHere card |
| Airbnb, Booking.com, Agoda, Vrbo iCal | Availability sync | Import URLs fetched every 15 minutes; export URL per room | Free | Manual blocks |
| Connectivity partner for direct OTA API (e.g. a certified channel manager API) | Real-time rates and availability both ways | Partner API per property | USD 10–20 per property per month; Release 3 | iCal |
| WhatsApp Business Cloud API | Guest concierge, staff tasks, provider job cards | Webhooks; pre-approved templates in EN/DE/FR/HI; 24-hour service window | Per conversation (Meta pricing) | Email, SMS |
| LLM API (Anthropic/OpenAI) | Concierge answers, translations of listings, slip OCR | Server-side calls with tools; retrieval from knowledge_entry | Per token; budget about LKR 300 per property per month | Quick replies |
| Resend or Postmark | Transactional email (confirmations, invoices) | API with templates; DKIM per custom domain | Free to USD 20/month | — |
| Local SMS gateway | OTP and fallback | HTTP API | Per message | Voice OTP |
| Google Maps Platform | Map embed, directions link, place autocomplete at setup | Embed API (free tier), Places API | Mostly free at this scale | Static map image |
| Exchange-rate feed (open API) | Daily currency display | Cron fetch | Free | Last known rate |
| Cloudflare (DNS, R2, Pages/Workers) | Custom domains with TLS, image storage and resizing | API for CNAME setup; R2 S3 API | Near zero | Vercel |
| Supabase | Postgres, auth, RLS | SDK | USD 0–25/month | Self-hosted Postgres |
| Google Business Profile | Owner's reviews and "book direct" link | Manual setup during onboarding | Free | — |
| SLTDA registration | Compliance helper | Pre-filled PDF; no API | Free | Manual |
| PDF generation | Invoices and statements | Server-side HTML to PDF | Compute only | — |
| Sentry, Grafana Cloud, Uptime Kuma | Errors, metrics, uptime | SDKs | Free tiers | — |

### Integration rules
- All gateway credentials belong to the owner and are entered through a guided setup; you store them encrypted and never see card data.
- Every webhook is signature-verified and idempotent on the provider's event ID.
- The concierge can read availability and send a payment link, but only a confirmed payment webhook changes inventory.
- WhatsApp templates in four languages are submitted for approval in week 1 of Release 2; until approved, replies stay within the 24-hour service window.

## 8. Pricing, plans, commissions and revenue model

Offer two ways to pay so that a nervous owner can start without a fixed cost: a flat monthly plan, or 2.5% of direct-booking value with no monthly fee. Add-on commissions are the second revenue line and grow with the number of guests, not the number of owners.

### Plans (LKR per month; annual = 2 months free)

| Plan | Flat price | Or percentage | Properties / rooms | Includes |
|---|---|---|---|---|
| Basic | 5,000 | 2.5% of direct bookings (min 0) | 1 property, up to 5 rooms | Booking site, calendar, iCal sync, deposits, WhatsApp quick replies, reports |
| Pro | 10,000 | 2.5% of direct bookings | 1 property, up to 15 rooms | + AI concierge, pre-arrival sequences, housekeeping board, add-on marketplace, reviews, guest CRM |
| Pro Multi | 15,000 + 5,000 per extra property | 2.0% | up to 5 properties | + multi-property calendar, manager accounts, consolidated reports |
| Manager | 25,000 + 3,000 per managed property | 1.5% | unlimited | + per-owner statements, payout calculation, white-label guest sites |

### Add-on marketplace commission
- Standard split on each add-on sold: provider 75–80%, owner 10–15%, you 10%.
- Example: airport pickup from Colombo to Mirissa at USD 55; provider USD 42, owner USD 7.5, you USD 5.5.
- Settled monthly: you invoice the owner for your commission together with the subscription; the owner pays providers directly or you pay providers on the owner's behalf in Release 3.

### Metered extras
- WhatsApp conversations above 500 per month: at cost + 20%.
- Direct OTA API connection (Release 3): LKR 4,000 per property per month pass-through.
- Custom domain: free; premium theme design: LKR 25,000 one-off.

### Revenue projection

| Metric | Month 6 | Month 12 | Month 18 |
|---|---|---|---|
| Basic properties | 15 | 40 | 70 |
| Pro properties | 6 | 25 | 55 |
| Pro Multi / Manager tenants | 1 | 4 | 10 |
| Subscription revenue (LKR) | 150,000 | 530,000 | 1,100,000 |
| Add-on commissions (LKR) | 25,000 | 150,000 | 400,000 |
| Metered extras (LKR) | 5,000 | 40,000 | 120,000 |
| Total monthly revenue (LKR) | 180,000 | 720,000 | 1,620,000 |
| Infra, messaging, LLM cost (LKR) | 35,000 | 110,000 | 230,000 |

LKR 1M/month lands around month 14–16. Assumes 3% monthly churn and strong seasonality: sign-ups peak in October–December before the South-coast high season and in April–May before Arugam Bay's season.

### Why owners say yes
- A Pro owner with USD 2,000 a month of direct bookings saves about USD 300 in OTA commission and pays LKR 10,000 (about USD 30).
- The percentage option costs nothing in a dead month.
- Add-ons are new income for the owner, not a cost.

### Policies
- Subscription billed to the owner by PayHere recurring, LankaQR or bank transfer; 7-day grace, then the guest site shows "enquire on WhatsApp" instead of instant booking until paid.
- Percentage plans are reconciled from confirmed direct bookings in the system; owners cannot delete bookings, only cancel with a reason.
- Prices reviewed each December with 60 days' notice.

## 9. Go-to-market, onboarding and launch plan

Sign the first 20 properties in person on a two-week South-coast trip before the December high season, then let their guest sites and add-on partners pull in the neighbours.

### Launch sequence

| Phase | When | What | Target |
|---|---|---|---|
| Discovery trip | Weeks 1–2 | Visit 40 properties Weligama–Tangalle; 20-minute interviews on commission, double bookings, WhatsApp load; collect 10 pilot commitments | Interview notes; 10 pilots |
| MVP build | Weeks 3–10 | Booking site, calendar, iCal sync, deposits, WhatsApp inbox | Pilot sites live |
| Pilot | Weeks 10–18 (before December) | Free for 3 months; weekly WhatsApp check-ins; measure direct bookings | 10 properties with at least 5 direct bookings each |
| Paid launch | Month 5 | Convert pilots; Release 2 (concierge, housekeeping, add-ons) | 20 paying properties |
| Second cluster | Months 6–10 | Ella and Arugam Bay trips; local field agent in each | 60 properties |
| Managers and multi-property | Months 10–15 | Release 3; sell to 5 caretaker companies | 100 properties |

### Channels
- In-person visits with a laptop demo and a live site built on the spot in 20 minutes.
- Add-on partners as a sales channel: drivers and surf schools introduce you to every guesthouse they already work with; they earn from the marketplace.
- Owner WhatsApp groups and tourism associations in each town.
- Facebook groups for Sri Lankan guesthouse owners and Airbnb hosts.
- Case study with numbers: "Villa X moved 32% of bookings direct in 90 days and saved LKR 180,000."
- SEO on the owners' own sites: every property site links to "powered by" your brand; neighbours search and find you.
- Nomad and traveller content (optional, feeds demand to your properties' direct sites).

### Onboarding (what "done for you" means)
- 60-minute visit: photos taken with your phone if needed, rooms and rates entered, site live before you leave.
- iCal links pasted into Airbnb and Booking.com together; first sync verified.
- PayHere or PayPal connected, or LankaQR code photographed; LKR 500 test deposit run.
- WhatsApp number connected; quick replies loaded in the owner's languages.
- Google Business Profile updated with the new direct-booking link.
- Printed card for the reception desk: "Book direct next time and save 10%" with a QR code.

### Messaging that works
- To owners: "Keep the 15% you pay Booking.com. Your own site, your own calendar, your WhatsApp answered."
- To managers: "Every owner's calendar and statement in one place."
- To guests (on the site): "Best price here. Book direct and pay a smaller deposit."

### Support model
- WhatsApp support 7 am–10 pm (check-ins happen late); English and Sinhala/Tamil.
- Sync-health alerts handled proactively: you call the owner before they notice.
- Monthly owner webinar before each season on pricing and direct-booking tactics.

### Launch checklist
- ☐ 40 property interviews summarized
- ☐ 10 pilot sites live with iCal verified
- ☐ PayHere, PayPal and LankaQR test payments completed for 3 pilots
- ☐ WhatsApp templates approved in EN/DE/FR/HI
- ☐ GDPR privacy notice and cookie banner on guest sites
- ☐ Reception desk cards printed
- ☐ Case-study numbers tracked from day 1 of the pilot

## 10. Budget, risks, KPIs and roadmap

Cash to reach paid launch: about LKR 240,000, with travel to the coast the largest line. Time it so the pilot runs through the December–March season, when owners feel the commission pain most.

### Startup budget (LKR)

| Item | Cost | Notes |
|---|---|---|
| Domain (.lk and .com), wildcard TLS via Cloudflare | 12,000 |  |
| Supabase, Fly.io, Upstash, R2, Vercel, 6 months | 45,000 | About USD 25/month |
| WhatsApp Business API and LLM credits for pilot | 30,000 | 10 properties, 3 months |
| Two field trips (South coast, Ella) | 60,000 | Bus/train, budget stays, 2 weeks each |
| Reception cards and QR prints for pilots | 10,000 |  |
| Demo video and site templates (freelance designer) | 35,000 | Three themes |
| Business registration | 5,000 | Sole proprietor; Pvt Ltd when commissions start |
| Google Play developer account | 8,500 |  |
| Contingency | 35,000 |  |
| Total | 240,500 |  |

### Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tourism shock (geopolitics, airline disruption, as in 2026) | Medium | High | Percentage plans cost owners nothing in a bad month; target Indian and domestic travellers; keep costs variable |
| Owners don't drive traffic to their own site | High | High | Reception card, repeat-guest discount codes, Google Business link, WhatsApp link in OTA messages where allowed; show "commission saved" every month |
| iCal lag causes a double booking | Medium | High | Conflict alerts within 15 minutes; cleaning buffer; Release 3 direct API; clear onboarding on limits |
| Gateway approval delays (PayHere, PayPal) | Medium | Medium | LankaQR and bank transfer work on day one; help owners with documents |
| Global PMS cuts prices or adds LKR billing | Low | Medium | Local payments, add-on marketplace and in-person service are hard to copy from abroad |
| Add-on provider quality complaints | Medium | Medium | Ratings, auto-removal below 4.0, owner approves providers |
| GDPR complaint from an EU guest | Low | High | Privacy notice, deletion flow, minimal data |
| Founder spends the season building instead of selling | High | High | Freeze features in November and February; sell |
| Owner churn after low season | Medium | Medium | Annual plans with 2 months free; pause option instead of cancel |

### KPIs

| KPI | Month 6 target | Month 12 target |
|---|---|---|
| Paying properties | 22 | 69 |
| Direct bookings per property per month | 4 | 7 |
| Share of bookings direct | 20% | 30% |
| Direct-booking value through the platform (USD/month) | 25,000 | 120,000 |
| Add-on orders per month | 60 | 400 |
| Sync conflicts per 100 bookings | under 1 | under 0.3 |
| Monthly churn | under 5% | under 3% |
| Monthly revenue (LKR) | 180,000 | 720,000 |

### Roadmap
- Months 1–5: MVP, South-coast pilot, paid launch.
- Months 6–10: Release 2 (concierge, housekeeping, add-ons, reviews); Ella and Arugam Bay; first field agents.
- Months 10–15: Release 3 (multi-property, managers, direct OTA API, long-stay invoicing); Pvt Ltd; accountant; provider payouts.
- Months 15–24: Kandy, Sigiriya, Jaffna; dynamic pricing suggestions; owner financing partnerships; possible expansion to the Maldives guesthouse market, which shares the same OTA pain.

### Decision rules
- If fewer than 6 of 10 pilot properties get 5+ direct bookings in 3 months, the problem is traffic, not software: pause features and build the repeat-guest and Google-profile tools first.
- If add-on commissions exceed subscriptions by month 12, shift pricing toward the percentage model and invest in the provider network.
- If a town has fewer than 10 paying properties after a season, leave it.

## 11. Deployment guide and running costs

Go from an empty laptop to a live, paid product in these steps. Monthly running cost is about USD 25 at launch and USD 100–150 at 100 properties; your subscription from one Basic property (LKR 5,000) covers the launch-stage bill.

### Step-by-step deployment
- Accounts (day 1): GitHub (code), Cloudflare (domain, DNS, R2), Supabase (Postgres, auth), Fly.io or Hetzner (API), Vercel (guest sites and owner web app), Upstash (Redis), Resend (email), Sentry. All have free tiers.
- Domain: register yourbrand.lk (LK Domain Registry, about LKR 5,000/year) and yourbrand.com (Cloudflare, about USD 10/year). Point both at Cloudflare DNS. Add a wildcard record *.yourbrand.lk so every property gets name.yourbrand.lk automatically.
- Database: create a Supabase project in Singapore; run the migrations from Section 6; enable row-level security on every table; turn on daily backups and point-in-time recovery (paid tier, USD 25/month, needed before paying customers).
- API: Dockerize the NestJS API; deploy to Fly.io Singapore (fly launch, 1 shared CPU, 512 MB RAM, about USD 5–7/month) or a Hetzner CX22 (USD 6/month) with Docker Compose and Caddy for TLS. Set secrets with fly secrets set (database URL, gateway keys, Meta tokens, Resend key).
- Workers: run the iCal-sync and messaging workers as a second Fly process group on the same app ([processes] in fly.toml) so they scale separately.
- Guest sites and owner web app: push the Next.js repo to GitHub; import into Vercel; set environment variables; add *.yourbrand.lk and yourbrand.com as domains in Vercel (wildcard domains need the Vercel Pro plan at USD 20/month; alternatively deploy to Cloudflare Pages where wildcards are free).
- Owner Android app: build the Flutter release APK/AAB; create a Google Play developer account (USD 25 one-off); publish to the internal testing track first, then production.
- Payments: register your own PayHere account (for billing owners); write the guided setup that lets each owner connect their PayHere, PayPal and LankaQR. Test every gateway with a live LKR 100 transaction.
- WhatsApp: create a Meta Business account, verify the business (takes 2–10 days), create a WhatsApp Business App, register a number, submit templates in EN/DE/FR/HI.
- Monitoring: Sentry DSN in API and web; Uptime Kuma on the Hetzner box pinging the API and one guest site every minute, alerting your Telegram; a daily cron that emails you sync-health and error counts.
- CI/CD: GitHub Actions runs tests on every push; main auto-deploys API to Fly and web to Vercel; tag releases weekly.
- Go-live checklist: backups verified by a restore, TLS on every domain, privacy notice linked in every guest site footer, a test booking end to end on a real phone over 4G.

### Monthly running cost (USD)

| Item | Launch (10 properties) | 100 properties | 300 properties |
|---|---|---|---|
| Supabase (Pro tier once live) | 25 | 25 | 60 |
| Fly.io / Hetzner API and workers | 7 | 20 | 45 |
| Vercel or Cloudflare Pages | 0 | 20 | 20 |
| Cloudflare R2 (photos) | 1 | 5 | 15 |
| Upstash Redis | 0 | 10 | 20 |
| Resend email | 0 | 20 | 40 |
| WhatsApp conversations (Meta) | 5 | 60 | 180 |
| LLM API (concierge, OCR) | 5 | 40 | 120 |
| Sentry, Uptime Kuma | 0 | 0 | 26 |
| Domains (amortized) | 2 | 2 | 2 |
| Total | 45 | 202 | 528 |
| Total in LKR (at 331) | 15,000 | 67,000 | 175,000 |

### What you take in versus what it costs

| Scale | Monthly revenue (from Section 8) | Monthly running cost | Gross margin |
|---|---|---|---|
| 10 properties (pilot converting) | LKR 80,000 | LKR 15,000 | 81% |
| 100 properties | LKR 1,000,000 | LKR 67,000 | 93% |
| 300 properties | LKR 3,200,000 | LKR 175,000 | 95% |

The prices to charge are in Section 8: LKR 5,000 (Basic), 10,000 (Pro), 15,000 + 5,000 per extra property (Pro Multi), 25,000 + 3,000 per managed property (Manager), or 2.5% of direct bookings instead of a flat fee, plus 10% of every add-on sold.

## 12. Claude Code prompts: plan, build in phases, design, SEO

Export this document as Markdown into the repo as docs/spec.md before the first prompt. The guest booking site is where design and SEO earn money, so two of the prompts below focus only on it.

### Setup once (from the videos)
- Install Claude Code; monorepo with apps/api (NestJS), apps/web (Next.js: guest sites + owner web), apps/mobile (Flutter owner app), packages/shared; let it write CLAUDE.md.
- Install the frontend-design and UI UX Pro Max skills; add Framer Motion to the guest sites (video 2).
- Browse 21st.dev for gallery, date-picker and testimonial components and paste their prompts when building the guest site (video 2).
- Design the three guest-site themes in Claude Design: start with context (two premium hotel templates as reference, real photos of a pilot villa, the spec), generate, animate the hero with a looping drone or ocean video from Google Flow/Whisk, then Handoff to Claude Code (video 1).
- After launch for each property: connect their domain or subdomain, Search Console, sitemap, titles and meta descriptions with place names, useful local content, fast on 4G, backlinks from local guides (video 3).

### Prompt 1 — Plan before you start

Read docs/spec.md fully. You are the lead engineer for a direct-booking and operations SaaS for small villas and homestays in Sri Lanka, built by one developer: NestJS API on Fly.io Singapore, Next.js guest sites and owner web on Vercel with per-property subdomains and custom domains, Flutter owner app, Supabase Postgres with RLS by tenant_id and a night_inventory table with a unique (room_id, date) reserved index, BullMQ workers for iCal sync every 15 minutes, WhatsApp Cloud API, PayHere, LankaQR and PayPal under each owner's own accounts, Cloudflare R2 for photos.
Produce a plan, not code:
1. Split the MVP in Section 3 into 3 phases with a definition of done each, ordered so that a guest can book and pay a deposit on a live subdomain and the nights appear blocked on Airbnb via iCal at the end of Phase 1.
2. Write the monorepo layout, the schema from Section 6, shared types, and the env var list per app.
3. Specify the hostname routing for *.yourbrand.lk and custom domains on Vercel or Cloudflare Pages, and the cache strategy for guest pages.
4. List every account and credential with lead times (Meta verification, PayHere, Vercel wildcard domains).
5. List the 20 riskiest decisions (double booking, hold expiry, iCal lag, currency display, refunds, GDPR for EU guests) and how you handle each.
6. Write CLAUDE.md with rules: inventory changes only inside transactions, money rows append-only, webhooks verified and idempotent, guest pages under 2 s on 4G, use frontend-design and UI UX Pro Max for UI.
Ask up to 5 questions, then wait for approval.

### Prompt 2 — Phase 1: inventory, booking, iCal, deposits

Build Phase 1: owner phone-OTP auth, property and room setup, seasonal rate plans, the night_inventory model with holds that expire after 15 minutes and a unique reserved index, availability search, booking creation inside a transaction, PayHere and PayPal checkout under the owner's credentials with webhooks that confirm the booking, bank-transfer and LankaQR instructions with a reference code, the iCal export per room and the import worker with diff, conflict detection and owner alerts, confirmation emails via Resend, and the owner web dashboard (arrivals, revenue by source, commission saved, sync health).
Write tests that prove two concurrent requests cannot reserve the same night and that an expired hold releases the night. Seed a demo property with 6 rooms.

### Prompt 3 — Phase 2: WhatsApp, concierge, housekeeping, add-ons

Build Phase 2: WhatsApp Cloud API inbox per property, quick replies in EN/DE/FR/HI, pre-arrival and check-out message sequences, the AI concierge with tools check_availability, quote, send_booking_link and escalate (never confirms without a payment webhook), the guest house-guide page, the daily task board and cleaner WhatsApp list, the add-on catalogue with provider job cards and commission tracking, review requests with private routing of low ratings, and the guest CRM with repeat-guest discount codes. Submit the WhatsApp templates. Add the Flutter owner app for today's arrivals, tasks and the inbox, with offline viewing.

### Prompt 4 — Phase 3: multi-property, managers, OTA API, long stays

Build Phase 3: multi-property calendar, manager-company tenants with per-owner statements and payout calculation, white-label guest sites, a connectivity-partner adapter for real-time Booking.com and Airbnb rates and availability, monthly long-stay rate plans with invoices suitable for Digital Nomad Visa renewal, provider ratings with auto-removal under 4.0, the commission ledger and monthly owner statement, and the admin console with feature flags, theme editor and translation management.

### Prompt 5 — Guest booking site UI/UX with design skills

Use the frontend-design and UI UX Pro Max skills and Framer Motion. Integrate the three Claude Design theme handoffs as selectable templates and make the guest booking site convert:
- Hero with a lazy-loaded looping video (reduced-motion poster fallback) and the date picker visible without scrolling on mobile.
- Room cards with swipeable galleries, price in the guest's currency, and a sticky "Book" bar on mobile.
- A three-step checkout (dates → details → pay) with a progress indicator, the deposit and cancellation policy shown before payment, and payment options grouped by guest type (card, PayPal, UPI via LankaQR, bank transfer).
- A confirmation screen that mirrors the WhatsApp message and shows directions.
- Trust elements: reviews, SLTDA number, host photo, response time.
Targets: under 2 s first load on 4G, Lighthouse mobile 95+, WCAG AA, images under 150 KB. Show me screenshots from the dev server on a 375 px viewport for each theme before polishing; iterate once on my feedback.

For the owner web and Flutter app, run a second pass: "Design for an owner on a phone at the beach: today-first, one-thumb navigation, green/red states for paid and unpaid, sync health visible, dark mode."

### Prompt 6 — SEO for every property site and your marketing site (video 3 checklist)

Implement SEO that works per property automatically:
1. Each guest site: title and meta description generated from property name, type and place ("Beachfront villa in Mirissa — book direct, best price"), JSON-LD LodgingBusiness with rooms, amenities, geo and reviews, Open Graph images from the gallery, hreflang for EN/DE/FR/HI, canonical to the custom domain when set, sitemap.xml per site, robots.txt.
2. Local content blocks per property: "how to get here", "things to do nearby", "best time to visit" generated once from the knowledge base and editable by the owner.
3. Performance: next/image, self-hosted fonts, no layout shift, edge caching with revalidation on availability change.
4. Your marketing site at yourbrand.lk: pages per cluster (Mirissa, Weligama, Ella, Arugam Bay, Kandy, Sigiriya) targeting "direct booking software for guesthouses Sri Lanka" and "Booking.com commission alternative", pricing from Section 8, case study, FAQ with FAQPage JSON-LD, a /blog with 12 posts for owners.
5. Post-launch checklist for me and for each owner: connect domain, Search Console verification per site (DNS or meta tag), sitemap submission, Google Business Profile booking link, first 10 backlink targets (local tourism directories, surf school and driver partner sites).
Show me Lighthouse reports for one guest site and the marketing site.

### How to run these well
- Start every session with "Read CLAUDE.md and docs/spec.md"; name the app you are working in.
- Ask Claude Code to simulate a season of bookings (1,000 random requests) against the inventory before Phase 1 is accepted.
- Review every migration touching night_inventory, booking or payment yourself.
