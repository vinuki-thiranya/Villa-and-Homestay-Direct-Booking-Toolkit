-- Release 3 (spec §12 Prompt 4): team access, manager companies and owner statements, white label,
-- long stays and invoices, OTA connectivity adapter, provider ratings, commission ledger, admin console.
-- REVIEW BY HAND: adds money tables (invoice, commission_ledger, owner_statement — append-only) and
-- triggers on night_inventory.

-- ---------------------------------------------------------------- team and property access
-- Managers and staff see only the properties listed here; no rows = all properties of the tenant.
create table user_property (
  tenant_id   uuid not null references tenant(id),
  user_id     uuid not null references app_user(id) on delete cascade,
  property_id uuid not null references property(id) on delete cascade,
  primary key (user_id, property_id)
);

create table invite (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id),
  token            text not null unique default encode(gen_random_bytes(18), 'hex'),
  name             text not null,
  phone            text not null,
  role             text not null check (role in ('manager', 'staff')),
  property_ids     uuid[] not null default '{}',
  invited_by       uuid references app_user(id),
  expires_at       timestamptz not null default now() + interval '7 days',
  accepted_at      timestamptz,
  accepted_user_id uuid references app_user(id),
  revoked_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index on invite (tenant_id, created_at desc);

-- ---------------------------------------------------------------- manager companies
-- The absent owners a caretaker company manages properties for (spec §2 "Manager" segment).
create table property_owner (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenant(id),
  name               text not null,
  email              text,
  phone              text,
  -- AES-GCM ciphertext of { bankName, accountName, accountNumber, branch, swift }
  payout_details     text,
  management_fee_pct numeric(5,2) not null default 20 check (management_fee_pct between 0 and 60),
  notes              text not null default '',
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);
alter table property add column owner_id uuid references property_owner(id);

-- White label: tenant brand used on guest sites, emails and statements (Manager plan).
alter table tenant add column brand jsonb not null default '{}';

-- ---------------------------------------------------------------- long stays (spec §3.10)
alter table rate_plan drop constraint rate_plan_kind_check;
alter table rate_plan add constraint rate_plan_kind_check check (kind in ('seasonal', 'weekend', 'long_stay', 'last_minute', 'monthly'));
alter table rate_plan
  add column monthly_rate numeric(12,2) check (monthly_rate is null or monthly_rate >= 0),
  add column utilities    text check (utilities in ('included', 'metered'));

create table utility_reading (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id),
  booking_id    uuid not null references booking(id),
  meter         text not null check (meter in ('electricity', 'water', 'gas', 'other')),
  period_start  date not null,
  period_end    date not null,
  start_reading numeric(12,2) not null,
  end_reading   numeric(12,2) not null check (end_reading >= start_reading),
  unit_rate     numeric(12,4) not null check (unit_rate >= 0),
  amount        numeric(12,2) not null,
  invoice_id    uuid,
  created_at    timestamptz not null default now()
);
create index on utility_reading (booking_id);

-- ---------------------------------------------------------------- invoices (append-only)
create table invoice_counter (
  tenant_id uuid not null references tenant(id),
  year      int not null,
  last      int not null default 0,
  primary key (tenant_id, year)
);

create table invoice (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  property_id       uuid references property(id),
  booking_id        uuid references booking(id),
  property_owner_id uuid references property_owner(id),
  kind              text not null check (kind in ('booking', 'long_stay', 'owner_statement', 'platform')),
  number            text not null,
  period_start      date,
  period_end        date,
  bill_to           jsonb not null default '{}',
  lines             jsonb not null default '[]',
  currency          text not null,
  subtotal          numeric(12,2) not null,
  taxes             numeric(12,2) not null default 0,
  total             numeric(12,2) not null,
  paid              numeric(12,2) not null default 0,
  pdf_url           text,
  -- a corrected invoice is a new row (credit-note style), never an edit
  supersedes_id     uuid references invoice(id),
  issued_at         timestamptz not null default now(),
  unique (tenant_id, number)
);
create index on invoice (booking_id);
create trigger trg_invoice_append_only before update or delete on invoice
  for each row execute function forbid_money_mutation();
alter table utility_reading add constraint utility_reading_invoice_fk foreign key (invoice_id) references invoice(id);

-- ---------------------------------------------------------------- platform billing (append-only ledger)
create table subscription (
  tenant_id          uuid primary key references tenant(id),
  plan               text not null check (plan in ('basic', 'pro', 'pro_multi', 'manager')),
  billing_model      text not null default 'flat' check (billing_model in ('flat', 'pct')),
  started_at         date not null default current_date,
  renews_at          date,
  status             text not null default 'active' check (status in ('trial', 'active', 'paused', 'cancelled')),
  updated_at         timestamptz not null default now()
);

create table commission_ledger (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenant(id),
  period               text not null check (period ~ '^\d{4}-\d{2}$'),
  plan                 text not null,
  billing_model        text not null,
  properties           int not null,
  subscription_fee     numeric(12,2) not null default 0,   -- LKR
  direct_booking_value numeric(12,2) not null default 0,   -- LKR
  pct_fee              numeric(12,2) not null default 0,   -- LKR
  add_on_commission    numeric(12,2) not null default 0,   -- LKR
  adjustment           numeric(12,2) not null default 0,
  total_due            numeric(12,2) not null,
  currency             text not null default 'LKR',
  fx_usd_lkr           numeric(12,4),
  status               text not null default 'due' check (status in ('due', 'paid', 'void')),
  paid_at              timestamptz,
  note                 text,
  supersedes_id        uuid references commission_ledger(id),
  created_at           timestamptz not null default now()
);
create unique index uq_ledger_period on commission_ledger (tenant_id, period) where supersedes_id is null;
create trigger trg_ledger_append_only before update or delete on commission_ledger
  for each row execute function forbid_money_mutation();

create table owner_statement (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  property_owner_id uuid not null references property_owner(id),
  period            text not null check (period ~ '^\d{4}-\d{2}$'),
  currency          text not null,
  direct_revenue    numeric(12,2) not null,
  ota_revenue       numeric(12,2) not null,
  add_on_income     numeric(12,2) not null,
  management_fee    numeric(12,2) not null,
  expenses          numeric(12,2) not null,
  platform_fees     numeric(12,2) not null,
  payout            numeric(12,2) not null,
  lines             jsonb not null default '[]',
  invoice_id        uuid references invoice(id),
  supersedes_id     uuid references owner_statement(id),
  created_at        timestamptz not null default now()
);
create unique index uq_owner_statement on owner_statement (property_owner_id, period, currency) where supersedes_id is null;
create trigger trg_owner_statement_append_only before update or delete on owner_statement
  for each row execute function forbid_money_mutation();

-- ---------------------------------------------------------------- OTA connectivity adapter
create table channel_connection (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenant(id),
  property_id          uuid not null unique references property(id),
  partner              text not null,                 -- adapter key, e.g. 'simulated'
  external_property_id text not null,
  -- { "<room uuid>": "<partner room code>" }
  room_map             jsonb not null default '{}',
  channels             text[] not null default '{booking_com,airbnb}',
  status               text not null default 'active' check (status in ('active', 'paused', 'error')),
  needs_full_push      boolean not null default true,
  last_push_at         timestamptz,
  last_pull_at         timestamptz,
  last_error           text,
  created_at           timestamptz not null default now()
);

-- Room-nights whose availability must be pushed to the partner. Filled by triggers so every
-- inventory write (bookings, holds, blocks, iCal, cancellations) is queued without app changes.
create table channel_ari_queue (
  room_id   uuid not null references room(id) on delete cascade,
  date      date not null,
  tenant_id uuid not null references tenant(id),
  queued_at timestamptz not null default now(),
  primary key (room_id, date)
);

create or replace function queue_channel_ari() returns trigger language plpgsql as $$
begin
  if exists (select 1 from channel_connection c join room r on r.property_id = c.property_id
              where r.id = new.room_id and c.status = 'active') then
    insert into channel_ari_queue (room_id, date, tenant_id) values (new.room_id, new.date, new.tenant_id)
    on conflict (room_id, date) do update set queued_at = now();
  end if;
  return new;
end $$;
create trigger trg_night_inventory_ari after insert or update of status on night_inventory
  for each row execute function queue_channel_ari();

-- Rate or room changes: push the whole calendar again.
create or replace function flag_channel_full_push() returns trigger language plpgsql as $$
begin
  update channel_connection set needs_full_push = true where property_id = coalesce(new.property_id, old.property_id);
  return coalesce(new, old);
end $$;
create trigger trg_rate_plan_ari after insert or update or delete on rate_plan
  for each row execute function flag_channel_full_push();
create trigger trg_room_ari after insert or update on room
  for each row execute function flag_channel_full_push();

create table channel_event (
  partner      text not null,
  event_id     text not null,
  tenant_id    uuid references tenant(id),
  property_id  uuid references property(id),
  kind         text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  error        text,
  primary key (partner, event_id)
);

-- The simulated partner keeps its state in the database so the API, the worker and the tests
-- all see the same "OTA". Dev/test only; a real partner keeps this state on its side.
create table sim_partner_ari (
  external_property_id text not null,
  room_code            text not null,
  date                 date not null,
  availability         int not null,
  rate                 numeric(12,2),
  min_stay             int,
  updated_at           timestamptz not null default now(),
  primary key (external_property_id, room_code, date)
);
create table sim_partner_booking (
  revision_id          text primary key,
  external_property_id text not null,
  payload              jsonb not null,
  created_at           timestamptz not null default now(),
  acked_at             timestamptz
);

-- ---------------------------------------------------------------- provider ratings (spec §3.7 R3)
alter table provider
  add column removed_at     timestamptz,
  add column removed_reason text;
alter table add_on_order add column rated_at timestamptz, add column rating_comment text;

-- ---------------------------------------------------------------- admin console
create table platform_admin (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table feature_flag (
  key             text primary key,
  description     text not null,
  default_enabled boolean not null default false,
  -- plans that include the feature (spec §8); a tenant override always wins
  plans           text[] not null default '{}'
);
create table feature_flag_override (
  tenant_id  uuid not null references tenant(id),
  key        text not null references feature_flag(key) on delete cascade,
  enabled    boolean not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, key)
);

insert into feature_flag (key, description, plans) values
  ('ai_concierge',       'AI concierge answers guests on WhatsApp',                     '{pro,pro_multi,manager}'),
  ('housekeeping',       'Daily task board, cleaner lists, maintenance log',             '{pro,pro_multi,manager}'),
  ('add_on_marketplace', 'Experiences catalogue, provider job cards, commissions',       '{pro,pro_multi,manager}'),
  ('guest_crm',          'Reviews routing, guest CRM, repeat-guest codes',               '{pro,pro_multi,manager}'),
  ('long_stay',          'Monthly rate plans, utility billing, nomad visa invoices',     '{pro,pro_multi,manager}'),
  ('multi_property',     'More than one property, all-properties calendar',              '{pro_multi,manager}'),
  ('owner_statements',   'Property owners, per-owner statements and payouts',            '{manager}'),
  ('white_label',        'Guest sites and documents without StayDirect branding',        '{manager}'),
  ('ota_direct_api',     'Real-time two-way OTA connection (paid extra, LKR 4,000/mo)',  '{}');

create table theme (
  key        text primary key check (key ~ '^[a-z0-9-]{2,30}$'),
  name       text not null,
  -- CSS variable values for guest sites, e.g. { "brand": "#0f6e6b", "accent": "#e8a33d", ... }
  tokens     jsonb not null,
  published  boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now()
);
insert into theme (key, name, tokens) values
  ('lagoon', 'Lagoon', '{"brand":"#0f6e6b","brandStrong":"#0a5552","accent":"#e8a33d","bg":"#fbfaf7","surface2":"#eef5f3","radius":"14px"}'),
  ('jungle', 'Jungle', '{"brand":"#2f5d34","brandStrong":"#224527","accent":"#c9822b","bg":"#f8f7f1","surface2":"#eef2e8","radius":"14px"}'),
  ('surf',   'Surf',   '{"brand":"#1d4ed8","brandStrong":"#1e40af","accent":"#f97316","bg":"#f9fafb","surface2":"#eef2fb","radius":"14px"}');
-- property.theme already holds the key; keep it pointing at a real theme
alter table property add constraint property_theme_fk foreign key (theme) references theme(key);

create table translation (
  lang       text not null check (lang in ('en', 'de', 'fr', 'hi')),
  key        text not null,
  value      text not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (lang, key)
);

create table support_ticket (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenant(id),
  subject    text not null,
  status     text not null default 'open' check (status in ('open', 'pending', 'closed')),
  priority   text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  created_by uuid references app_user(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table ticket_message (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenant(id),
  ticket_id  uuid not null references support_ticket(id) on delete cascade,
  author     text not null,                 -- 'user:<id>' | 'admin:<id>'
  body       text not null,
  created_at timestamptz not null default now()
);
create index on ticket_message (ticket_id, created_at);

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['user_property','invite','property_owner','utility_reading','invoice_counter','invoice','subscription',
                           'commission_ledger','owner_statement','channel_connection','channel_ari_queue','channel_event',
                           'support_ticket','ticket_message','feature_flag_override']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy tenant_isolation on %I to staydirect_tenant using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant())', t);
    execute format('grant select, insert, update, delete on %I to staydirect_tenant', t);
  end loop;
end $$;
-- Property-scoped access for managers and staff: DbService.withTenant sets app.property_ids from
-- user_property; restrictive policies AND with tenant isolation. Unset = all properties (owners).
create or replace function app_allowed_properties() returns uuid[] language sql stable as $$
  select case when coalesce(current_setting('app.property_ids', true), '') = '' then null
              else string_to_array(current_setting('app.property_ids', true), ',')::uuid[] end
$$;

create policy property_scope on property as restrictive to staydirect_tenant
  using (app_allowed_properties() is null or id = any(app_allowed_properties()));
do $$
declare t text;
begin
  foreach t in array array['room','rate_plan','booking','conversation','message','quick_reply','knowledge_entry','ai_usage',
                           'sequence','staff','task','task_board_run','add_on','review','discount_code','channel_connection',
                           'invoice']
  loop
    execute format('create policy property_scope on %I as restrictive to staydirect_tenant
                      using (app_allowed_properties() is null or property_id is null or property_id = any(app_allowed_properties()))', t);
  end loop;
end $$;

-- Read-only platform tables tenants may read inside their session.
alter table feature_flag enable row level security;
create policy flags_read on feature_flag for select to staydirect_tenant using (true);
grant select on feature_flag to staydirect_tenant;
alter table theme enable row level security;
create policy theme_read on theme for select to staydirect_tenant using (true);
grant select on theme to staydirect_tenant;
-- Admin and simulator tables: no tenant access at all.
alter table platform_admin enable row level security;
alter table translation enable row level security;
alter table sim_partner_ari enable row level security;
alter table sim_partner_booking enable row level security;
