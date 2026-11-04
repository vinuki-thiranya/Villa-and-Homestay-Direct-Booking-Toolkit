-- StayDirect LK core schema (spec §6). REVIEW BY HAND: touches night_inventory, booking, payment.
-- Rules enforced here, not only in the app:
--   * a night can be held/reserved/blocked only once        (uq_night_active)
--   * money rows are append-only                             (trg_payment_append_only)
--   * every table carries tenant_id and has RLS enabled      (policies at the bottom)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tenancy
create table tenant (
  id              uuid primary key default gen_random_uuid(),
  type            text not null default 'owner' check (type in ('owner', 'manager_company')),
  name            text not null,
  language        text not null default 'en',
  base_currency   text not null default 'USD' check (base_currency in ('USD', 'LKR')),
  plan            text not null default 'basic' check (plan in ('basic', 'pro', 'pro_multi', 'manager')),
  billing_status  text not null default 'trial' check (billing_status in ('trial', 'active', 'grace', 'suspended')),
  created_at      timestamptz not null default now()
);

create table app_user (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  phone       text not null unique,
  email       text,
  name        text not null default '',
  role        text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  language    text not null default 'en',
  created_at  timestamptz not null default now()
);
create index on app_user (tenant_id);

-- Phone OTP for owner login. Not tenant-scoped (the user may not exist yet).
create table otp_code (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on otp_code (phone, created_at desc);

-- ---------------------------------------------------------------- property setup
create table property (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references tenant(id),
  name                        text not null,
  slug                        text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'),
  custom_domain               text unique,
  type                        text not null default 'villa',
  description                 text not null default '',
  address                     text not null default '',
  area                        text not null default '',
  lat                         double precision,
  lng                         double precision,
  sltda_number                text,
  sltda_expiry                date,
  check_in                    text not null default '14:00',
  check_out                   text not null default '11:00',
  timezone                    text not null default 'Asia/Colombo',
  whatsapp_number             text,
  email                       text,
  base_currency               text not null default 'USD' check (base_currency in ('USD', 'LKR')),
  default_deposit_pct         numeric(5,2) not null default 30,
  default_cancellation_policy text not null default 'moderate' check (default_cancellation_policy in ('flexible', 'moderate', 'strict')),
  tax_pct                     numeric(5,2) not null default 0,
  house_rules                 text not null default '',
  booking_mode                text not null default 'instant' check (booking_mode in ('instant', 'request')),
  cleaning_buffer_nights      int not null default 0 check (cleaning_buffer_nights between 0 and 3),
  manual_payment_hold_hours   int not null default 24 check (manual_payment_hold_hours between 1 and 72),
  -- AES-256-GCM ciphertext of GatewayConfig (packages/shared/src/schemas.ts). Never logged.
  gateway_config              text,
  theme                       text not null default 'lagoon',
  photos                      text[] not null default '{}',
  host_name                   text not null default '',
  host_photo_url              text,
  published                   boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index on property (tenant_id);

create table room (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenant(id),
  property_id             uuid not null references property(id),
  name                    text not null,
  description             text not null default '',
  max_guests              int not null check (max_guests > 0),
  base_guests             int not null default 2 check (base_guests > 0),
  beds                    text not null default '',
  bathroom                text not null default 'Private',
  amenities               text[] not null default '{}',
  photos                  text[] not null default '{}',
  base_rate               numeric(12,2) not null check (base_rate >= 0),
  extra_guest_rate        numeric(12,2) not null default 0 check (extra_guest_rate >= 0),
  min_nights              int not null default 1 check (min_nights >= 1),
  max_nights              int check (max_nights is null or max_nights >= min_nights),
  ical_export_token       text not null unique default encode(gen_random_bytes(18), 'hex'),
  -- null = use property.cleaning_buffer_nights
  cleaning_buffer_nights  int check (cleaning_buffer_nights between 0 and 3),
  -- null = use property.booking_mode
  booking_mode            text check (booking_mode in ('instant', 'request')),
  sort_order              int not null default 0,
  active                  boolean not null default true,
  created_at              timestamptz not null default now()
);
create index on room (property_id);

create table ical_source (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenant(id),
  room_id               uuid not null references room(id) on delete cascade,
  url                   text not null,
  channel               text not null check (channel in ('airbnb', 'booking_com', 'agoda', 'vrbo', 'other')),
  last_fetch_at         timestamptz,
  last_success_at       timestamptz,
  last_status           text,
  last_error            text,
  consecutive_failures  int not null default 0,
  snapshot_hash         text,
  -- last successfully applied set of {uid, date} pairs, for diffing
  snapshot              jsonb not null default '[]',
  created_at            timestamptz not null default now(),
  unique (room_id, url)
);

create table rate_plan (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenant(id),
  property_id         uuid not null references property(id),
  name                text not null,
  kind                text not null check (kind in ('seasonal', 'weekend', 'long_stay', 'last_minute')),
  room_ids            uuid[] not null default '{}',
  start_date          date,
  end_date            date,
  weekday_mask        int not null default 127 check (weekday_mask between 1 and 127),
  rate                numeric(12,2),
  adjustment_pct      numeric(6,2),
  min_stay_nights     int,
  within_days         int,
  deposit_pct         numeric(5,2),
  cancellation_policy text check (cancellation_policy in ('flexible', 'moderate', 'strict')),
  min_nights          int,
  closed_to_arrival   boolean not null default false,
  closed_to_departure boolean not null default false,
  priority            int not null default 10,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  check (start_date is null or end_date is null or start_date <= end_date)
);
create index on rate_plan (property_id);

-- ---------------------------------------------------------------- guests and bookings
create table guest (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id),
  name           text not null,
  email          text,
  phone          text,
  country        text,
  language       text not null default 'en',
  passport_last4 text,
  notes          text not null default '',
  stays_count    int not null default 0,
  created_at     timestamptz not null default now(),
  anonymized_at  timestamptz
);
create unique index uq_guest_email on guest (tenant_id, lower(email)) where email is not null;
create index on guest (tenant_id, phone);

create table booking (
  id                           uuid primary key default gen_random_uuid(),
  tenant_id                    uuid not null references tenant(id),
  property_id                  uuid not null references property(id),
  room_id                      uuid not null references room(id),
  guest_id                     uuid references guest(id),
  reference                    text not null unique,
  -- secret for the guest's booking/payment pages (reference alone is guessable)
  access_token                 text not null default encode(gen_random_bytes(24), 'hex'),
  from_date                    date not null,
  to_date                      date not null,
  guests                       int not null default 1,
  status                       text not null default 'pending'
                               check (status in ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'abandoned')),
  mode                         text not null default 'instant' check (mode in ('instant', 'request')),
  approved_at                  timestamptz,
  source                       text not null default 'direct',
  external_uid                 text,
  base_amount                  numeric(12,2) not null default 0,
  taxes                        numeric(12,2) not null default 0,
  discount                     numeric(12,2) not null default 0,
  add_ons_amount               numeric(12,2) not null default 0,
  total                        numeric(12,2) not null default 0,
  currency                     text not null,
  display_currency             text,
  deposit_due                  numeric(12,2) not null default 0,
  balance_due_date             date,
  cancellation_policy_snapshot jsonb not null default '{}',
  quote_snapshot               jsonb not null default '{}',
  special_requests             text not null default '',
  needs_refund                 boolean not null default false,
  cancel_reason                text,
  abandoned_followup_sent_at   timestamptz,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  check (from_date < to_date)
);
create index on booking (property_id, from_date);
create index on booking (tenant_id, status);
create unique index uq_booking_external on booking (room_id, source, external_uid) where external_uid is not null;

create table booking_status_log (
  id          bigserial primary key,
  tenant_id   uuid not null references tenant(id),
  booking_id  uuid not null references booking(id),
  from_status text,
  to_status   text not null,
  actor       text not null,
  note        text,
  at          timestamptz not null default now()
);
create index on booking_status_log (booking_id);

-- ---------------------------------------------------------------- inventory
create table hold (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  room_id     uuid not null references room(id),
  booking_id  uuid not null references booking(id),
  from_date   date not null,
  to_date     date not null,
  expires_at  timestamptz not null,
  released_at timestamptz,
  converted_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on hold (expires_at) where released_at is null and converted_at is null;
create index on hold (booking_id);

-- The single source of truth for availability. One row per occupied room-night.
-- Free nights have no active row. History stays as status = 'released'.
create table night_inventory (
  id           bigserial primary key,
  tenant_id    uuid not null references tenant(id),
  room_id      uuid not null references room(id),
  date         date not null,
  status       text not null check (status in ('held', 'reserved', 'blocked', 'released')),
  source       text not null check (source in ('direct', 'airbnb', 'booking_com', 'agoda', 'vrbo', 'other', 'manual')),
  booking_id   uuid references booking(id),
  hold_id      uuid references hold(id),
  ical_source_id uuid references ical_source(id) on delete set null,
  external_uid text,
  note         text,
  created_at   timestamptz not null default now(),
  released_at  timestamptz,
  check (status <> 'held' or hold_id is not null),
  check (status <> 'released' or released_at is not null)
);
-- THE double-booking guard (spec §4.2, extended to holds and blocks — docs/plan.md §3).
create unique index uq_night_active on night_inventory (room_id, date) where status in ('held', 'reserved', 'blocked');
create index on night_inventory (booking_id);
create index on night_inventory (ical_source_id) where status <> 'released';
create index on night_inventory (room_id, date);

create table sync_conflict (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id),
  room_id        uuid not null references room(id),
  date           date not null,
  ical_source_id uuid references ical_source(id) on delete set null,
  channel        text not null,
  external_uid   text,
  booking_id     uuid references booking(id),
  detected_at    timestamptz not null default now(),
  alerted_at     timestamptz,
  resolution     text,
  resolution_note text,
  resolved_at    timestamptz
);
create unique index uq_conflict_open on sync_conflict (room_id, date, coalesce(external_uid, '')) where resolved_at is null;

-- ---------------------------------------------------------------- money (append-only)
create table payment (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id),
  booking_id    uuid not null references booking(id),
  -- negative for refunds
  amount        numeric(12,2) not null,
  currency      text not null,
  -- same amount in the booking currency
  base_amount   numeric(12,2) not null,
  method        text not null check (method in ('payhere', 'lankaqr', 'paypal', 'bank', 'cash')),
  kind          text not null default 'charge' check (kind in ('charge', 'refund')),
  gateway_ref   text,
  slip_url      text,
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'reversed')),
  confirmed_by  text,
  confirmed_at  timestamptz,
  -- a status change is a new row pointing at the row it supersedes
  supersedes_id uuid references payment(id),
  note          text,
  created_at    timestamptz not null default now(),
  check ((kind = 'refund') = (amount < 0))
);
create index on payment (booking_id);
create unique index uq_payment_gateway_ref on payment (method, gateway_ref, kind, status) where gateway_ref is not null;

create or replace function forbid_money_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'Money rows are append-only (%.%): add a new row instead', tg_table_name, tg_op
    using errcode = 'P0001';
end $$;
create trigger trg_payment_append_only before update or delete on payment
  for each row execute function forbid_money_mutation();

-- Effective payment state: the latest row in each supersedes-chain.
create view v_payment_effective with (security_invoker = true) as
select p.* from payment p
where not exists (select 1 from payment n where n.supersedes_id = p.id);

create view v_booking_paid with (security_invoker = true) as
select b.id as booking_id,
       coalesce(sum(p.base_amount) filter (where p.status = 'confirmed'), 0)::numeric(12,2) as paid
from booking b
left join v_payment_effective p on p.booking_id = b.id
group by b.id;

-- ---------------------------------------------------------------- messaging, webhooks, audit, fx
create table message (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenant(id),
  property_id  uuid references property(id),
  guest_id     uuid references guest(id),
  booking_id   uuid references booking(id),
  channel      text not null check (channel in ('whatsapp', 'email', 'sms')),
  direction    text not null check (direction in ('in', 'out')),
  recipient    text,
  subject      text,
  body         text not null,
  template_id  text,
  status       text not null default 'queued',
  error        text,
  sent_at      timestamptz,
  read_at      timestamptz,
  ai_generated boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on message (property_id, created_at desc);

create table webhook_event (
  provider    text not null,
  event_id    text not null,
  tenant_id   uuid references tenant(id),
  payload     jsonb not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table audit_log (
  id        bigserial primary key,
  tenant_id uuid not null references tenant(id),
  actor     text not null,
  action    text not null,
  entity    text not null,
  entity_id text,
  before    jsonb,
  after     jsonb,
  at        timestamptz not null default now()
);
create index on audit_log (tenant_id, at desc);
create trigger trg_audit_append_only before update or delete on audit_log
  for each row execute function forbid_money_mutation();

create table fx_rate (
  base       text not null,
  quote      text not null,
  rate       numeric(18,8) not null,
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

-- ---------------------------------------------------------------- derived views
create view v_sync_health with (security_invoker = true) as
select s.id as source_id, s.tenant_id, s.room_id, r.name as room_name, r.property_id, s.channel, s.url,
       s.last_fetch_at, s.last_success_at, s.last_status, s.last_error, s.consecutive_failures
from ical_source s join room r on r.id = s.room_id;

-- ---------------------------------------------------------------- row-level security
-- Owner/manager requests run as staydirect_tenant with app.tenant_id set (DbService.withTenant).
-- The connecting owner role (workers, webhooks, guest site) bypasses RLS. Supabase's anon and
-- authenticated roles have no policies, so nothing is exposed through PostgREST.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'staydirect_tenant') then
    create role staydirect_tenant nologin;
  end if;
end $$;
grant staydirect_tenant to current_user;
grant usage on schema public to staydirect_tenant;

create or replace function app_current_tenant() returns uuid language sql stable as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

do $$
declare t text;
begin
  foreach t in array array['tenant','app_user','property','room','ical_source','rate_plan','guest','booking',
                           'booking_status_log','hold','night_inventory','sync_conflict','payment','message','audit_log']
  loop
    execute format('alter table %I enable row level security', t);
    if t = 'tenant' then
      execute format('create policy tenant_isolation on %I to staydirect_tenant using (id = app_current_tenant()) with check (id = app_current_tenant())', t);
    else
      execute format('create policy tenant_isolation on %I to staydirect_tenant using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant())', t);
    end if;
    execute format('grant select, insert, update, delete on %I to staydirect_tenant', t);
  end loop;
end $$;
alter table fx_rate enable row level security;
create policy fx_read on fx_rate for select to staydirect_tenant using (true);
grant select on fx_rate to staydirect_tenant;
grant select on v_payment_effective, v_booking_paid, v_sync_health to staydirect_tenant;
grant usage on all sequences in schema public to staydirect_tenant;
