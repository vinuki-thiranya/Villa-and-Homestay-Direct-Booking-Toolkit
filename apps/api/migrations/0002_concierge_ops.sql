-- Release 2 (spec §12 Prompt 3): WhatsApp inbox, concierge, sequences, house guide, housekeeping,
-- add-on marketplace, reviews, guest CRM. REVIEW BY HAND: adds columns to booking.

-- ---------------------------------------------------------------- property settings
alter table property
  add column concierge_enabled       boolean not null default false,
  -- WhatsApp Cloud API phone_number_id of this property's own number (null = platform number)
  add column whatsapp_phone_number_id text unique,
  add column google_review_url       text,
  -- house guide: { wifiName, wifiPassword, arrival, rules, emergency: [{label, phone}], places: [{name, kind, note, mapsUrl}] }
  add column guide                   jsonb not null default '{}',
  add column guide_token             text not null unique default encode(gen_random_bytes(12), 'hex'),
  -- "commission saved" and discount codes need these on the property
  add column repeat_guest_discount_pct numeric(5,2) not null default 10;

-- ---------------------------------------------------------------- bookings: promo codes, add-ons
create table discount_code (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  property_id uuid not null references property(id),
  code        text not null,
  guest_id    uuid references guest(id),
  pct         numeric(5,2) not null check (pct > 0 and pct <= 50),
  valid_from  date not null default current_date,
  expires_at  date not null,
  max_uses    int not null default 1 check (max_uses > 0),
  uses        int not null default 0,
  reason      text not null default 'manual' check (reason in ('manual', 'repeat_guest')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (property_id, code)
);
create unique index uq_repeat_code_per_guest on discount_code (property_id, guest_id) where reason = 'repeat_guest';

alter table booking
  add column discount_code_id uuid references discount_code(id),
  add column promo_discount   numeric(12,2) not null default 0,
  add column review_requested_at timestamptz;

-- ---------------------------------------------------------------- WhatsApp inbox
create table conversation (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenant(id),
  property_id        uuid not null references property(id),
  guest_id           uuid references guest(id),
  channel            text not null default 'whatsapp' check (channel in ('whatsapp')),
  contact            text not null,               -- E.164
  contact_name       text not null default '',
  language           text not null default 'en',
  status             text not null default 'open' check (status in ('open', 'needs_human', 'closed')),
  ai_paused          boolean not null default false,
  escalation_summary text,
  unread_count       int not null default 0,
  last_inbound_at    timestamptz,                 -- starts the 24-hour service window
  last_message_at    timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  unique (property_id, channel, contact)
);
create index on conversation (property_id, last_message_at desc);

alter table message
  add column conversation_id uuid references conversation(id),
  add column wa_message_id   text,
  add column sent_by         text;               -- 'guest' | 'ai' | 'system' | 'user:<id>'
create unique index uq_message_wa on message (wa_message_id) where wa_message_id is not null;
create index on message (conversation_id, created_at);

create table quick_reply (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  property_id uuid not null references property(id),
  topic       text not null,                     -- e.g. 'wifi', 'directions'
  language    text not null check (language in ('en', 'de', 'fr', 'hi')),
  title       text not null,
  body        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (property_id, topic, language)
);

-- ---------------------------------------------------------------- concierge
create table knowledge_entry (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  property_id uuid not null references property(id),
  title       text not null,
  body        text not null,
  language    text not null default 'en',
  -- Retrieval: a 2–15 room property's knowledge base fits in the cached system prompt, so the
  -- concierge reads all of it; embeddings are added when a property outgrows that (docs/plan.md).
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on knowledge_entry (property_id);

create table ai_usage (
  tenant_id     uuid not null references tenant(id),
  property_id   uuid not null references property(id),
  month         text not null,                   -- 'YYYY-MM'
  requests      int not null default 0,
  input_tokens  bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd      numeric(10,4) not null default 0,
  primary key (property_id, month)
);

-- ---------------------------------------------------------------- automated sequences
create table sequence (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  property_id uuid not null references property(id),
  trigger     text not null check (trigger in ('booking_confirmed', 'pre_arrival_7d', 'pre_arrival_1d', 'arrival', 'mid_stay', 'check_out')),
  channel     text not null default 'auto' check (channel in ('auto', 'whatsapp', 'email')),
  enabled     boolean not null default true,
  unique (property_id, trigger)
);

-- one send per booking and trigger: the job is idempotent
create table sequence_send (
  booking_id uuid not null references booking(id),
  trigger    text not null,
  tenant_id  uuid not null references tenant(id),
  channel    text not null,
  status     text not null,
  sent_at    timestamptz not null default now(),
  primary key (booking_id, trigger)
);

-- ---------------------------------------------------------------- housekeeping
create table staff (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenant(id),
  property_id  uuid not null references property(id),
  name         text not null,
  phone        text,
  role         text not null default 'cleaner' check (role in ('cleaner', 'maintenance', 'front_desk')),
  -- cleaners open their task list from a WhatsApp link, no login (spec §5)
  access_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table task (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id),
  property_id   uuid not null references property(id),
  room_id       uuid references room(id),
  booking_id    uuid references booking(id),
  date          date not null,
  type          text not null check (type in ('clean', 'prepare', 'maintenance', 'shopping')),
  title         text not null,
  assignee_staff_id uuid references staff(id),
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  photos        text[] not null default '{}',
  notes         text not null default '',
  cost          numeric(12,2),
  completed_at  timestamptz,
  source        text not null default 'manual' check (source in ('manual', 'daily_board')),
  created_at    timestamptz not null default now()
);
create index on task (property_id, date);
create unique index uq_task_generated on task (property_id, room_id, date, type) where source = 'daily_board';

create table task_board_run (
  property_id uuid not null references property(id),
  date        date not null,
  tenant_id   uuid not null references tenant(id),
  tasks       int not null,
  notified    int not null,
  at          timestamptz not null default now(),
  primary key (property_id, date)
);

-- ---------------------------------------------------------------- add-on marketplace
create table provider (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id),
  name          text not null,
  phone         text not null,
  service_types text[] not null default '{}',
  rating        numeric(3,2),
  rating_count  int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table add_on (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  property_id     uuid not null references property(id),
  name            text not null,
  description     text not null default '',
  category        text not null check (category in ('airport_pickup', 'driver', 'tuk_tuk', 'surf_lesson', 'whale_watching', 'safari', 'cooking_class', 'laundry', 'bicycle', 'other')),
  price           numeric(12,2) not null check (price >= 0),
  currency        text not null,
  provider_id     uuid references provider(id),
  -- split of each sale (spec §8): provider gets the rest
  commission_pct  numeric(5,2) not null default 12.5 check (commission_pct between 0 and 50),  -- owner
  platform_pct    numeric(5,2) not null default 10 check (platform_pct between 0 and 30),      -- StayDirect
  lead_time_hours int not null default 24,
  photo_url       text,
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
create index on add_on (property_id);

create table add_on_order (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenant(id),
  booking_id            uuid not null references booking(id),
  add_on_id             uuid not null references add_on(id),
  provider_id           uuid references provider(id),
  date                  date not null,
  time                  text,
  qty                   int not null default 1 check (qty > 0),
  amount                numeric(12,2) not null,
  currency              text not null,
  provider_amount       numeric(12,2) not null,
  owner_amount          numeric(12,2) not null,
  platform_amount       numeric(12,2) not null,
  status                text not null default 'requested' check (status in ('requested', 'confirmed', 'done', 'cancelled')),
  notes                 text not null default '',
  provider_token        text not null unique default encode(gen_random_bytes(18), 'hex'),
  provider_notified_at  timestamptz,
  provider_confirmed_at timestamptz,
  provider_paid_at      timestamptz,
  rating                int check (rating between 1 and 5),
  created_by            text not null default 'guest',
  created_at            timestamptz not null default now(),
  check (provider_amount + owner_amount + platform_amount = amount)
);
create index on add_on_order (booking_id);

-- ---------------------------------------------------------------- reviews
create table review (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  property_id uuid not null references property(id),
  booking_id  uuid not null unique references booking(id),
  rating      int not null check (rating between 1 and 5),
  body        text not null default '',
  -- ratings of 4–5 may be shown on the site; lower ratings go privately to the owner first
  public      boolean not null default false,
  guest_name  text not null default '',
  source      text not null default 'direct',
  owner_reply text,
  created_at  timestamptz not null default now()
);
create index on review (property_id, created_at desc);

-- ---------------------------------------------------------------- RLS for the new tables
do $$
declare t text;
begin
  foreach t in array array['discount_code','conversation','quick_reply','knowledge_entry','ai_usage','sequence','sequence_send',
                           'staff','task','task_board_run','provider','add_on','add_on_order','review']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy tenant_isolation on %I to staydirect_tenant using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant())', t);
    execute format('grant select, insert, update, delete on %I to staydirect_tenant', t);
  end loop;
end $$;
