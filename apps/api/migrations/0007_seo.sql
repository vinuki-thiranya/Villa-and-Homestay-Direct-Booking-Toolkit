-- SEO for every guest site (spec Prompt 6, docs/plan.md §10).
--
-- site_content holds the local content blocks ("how to get here", "things to do nearby", "best time
-- to visit") and translations of the owner's description and room descriptions, per language.
-- AI drafts start as 'draft'; nothing reaches the public site until the owner publishes it.

create table site_content (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  property_id uuid not null references property(id) on delete cascade,
  -- getting_here | things_to_do | best_time | description | room:{room id}
  key         text not null check (key in ('getting_here', 'things_to_do', 'best_time', 'description') or key ~ '^room:[0-9a-f-]{36}$'),
  lang        text not null check (lang in ('en', 'si', 'de', 'fr', 'hi')),
  body        text not null check (length(body) between 1 and 6000),
  status      text not null default 'draft' check (status in ('draft', 'published')),
  source      text not null default 'owner' check (source in ('ai', 'owner')),
  updated_by  uuid references app_user(id),
  updated_at  timestamptz not null default now(),
  unique (property_id, key, lang)
);
create index on site_content (property_id, status);

alter table site_content enable row level security;
create policy tenant_isolation on site_content to staydirect_tenant
  using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());
create policy property_scope on site_content as restrictive to staydirect_tenant
  using (app_allowed_properties() is null or property_id = any(app_allowed_properties()));
grant select, insert, update, delete on site_content to staydirect_tenant;

-- Search Console "HTML tag" verification code for the property's own site (DNS verification needs
-- nothing stored here).
alter table property add column google_site_verification text
  check (google_site_verification is null or google_site_verification ~ '^[A-Za-z0-9_-]{10,100}$');

-- Drafts per property per month (the owner app allows a few; each is one Claude call).
alter table ai_usage add column content_generations int not null default 0;

-- Drafting local content with Claude costs money, so it follows the plans; writing it by hand is free.
insert into feature_flag (key, description, plans) values
  ('ai_site_content', 'Draft local guide blocks and translations of the site with AI', '{pro,pro_multi,manager}');
