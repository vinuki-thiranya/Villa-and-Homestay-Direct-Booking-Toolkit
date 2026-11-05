-- Sinhala owner apps: the owner's UI language, and Sri Lanka's public holidays (Poya days marked).
-- No money tables are touched.

update app_user set language = 'en' where language not in ('en', 'si');
alter table app_user add constraint app_user_language check (language in ('en', 'si'));

-- Platform-wide reference data (like theme): no tenant_id, edited by StayDirect admins only.
create table public_holiday (
  date       date not null,
  name_en    text not null,
  name_si    text not null,
  is_poya    boolean not null default false,
  -- From the gazette / Central Bank list: 'public', 'bank', 'mercantile'.
  types      text[] not null default '{public,bank}',
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (date, name_en)
);
create index on public_holiday (date);
grant select on public_holiday to staydirect_tenant;

-- Source: Central Bank of Sri Lanka holiday lists for 2026 and 2027, which follow Extraordinary
-- Gazettes 2438/22 (2026) and 2493/05 (2027). Later gazette changes are entered in the admin console.
insert into public_holiday (date, name_en, name_si, is_poya, types) values
  ('2026-01-03', 'Duruthu Full Moon Poya Day', 'දුරුතු පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-01-15', 'Tamil Thai Pongal Day', 'දෙමළ තෛපොංගල් දිනය', false, '{public,bank,mercantile}'),
  ('2026-02-01', 'Navam Full Moon Poya Day', 'නවම් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-02-04', 'Independence Day', 'ජාතික නිදහස් දිනය', false, '{public,bank,mercantile}'),
  ('2026-02-15', 'Mahasivarathri Day', 'මහ සිවරාත්‍රි දිනය', false, '{public,bank}'),
  ('2026-03-02', 'Medin Full Moon Poya Day', 'මැදින් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-03-21', 'Id-Ul-Fitr (Ramazan Festival Day)', 'ඊදුල් ෆිතර් (රාමසාන් උත්සව දිනය)', false, '{public,bank}'),
  ('2026-04-01', 'Bak Full Moon Poya Day', 'බක් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-04-03', 'Good Friday', 'මහ සිකුරාදා දිනය', false, '{public,bank}'),
  ('2026-04-13', 'Day prior to Sinhala & Tamil New Year Day', 'සිංහල හා දෙමළ අලුත් අවුරුදු දිනයට පෙර දිනය', false, '{public,bank,mercantile}'),
  ('2026-04-14', 'Sinhala & Tamil New Year Day', 'සිංහල හා දෙමළ අලුත් අවුරුදු දිනය', false, '{public,bank,mercantile}'),
  ('2026-05-01', 'Vesak Full Moon Poya Day', 'වෙසක් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-05-01', 'May Day', 'ලෝක කම්කරු දිනය (මැයි දිනය)', false, '{public,bank,mercantile}'),
  ('2026-05-02', 'Day following Vesak Full Moon Poya Day', 'වෙසක් පුර පසළොස්වක පොහොය දිනයට පසු දිනය', false, '{public,bank,mercantile}'),
  ('2026-05-28', 'Id-Ul-Alha (Hadji Festival Day)', 'ඊදුල් අල්හා (හජ්ජි උත්සව දිනය)', false, '{public,bank}'),
  ('2026-05-30', 'Adhi Poson Full Moon Poya Day', 'අධි පොසොන් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-06-29', 'Poson Full Moon Poya Day', 'පොසොන් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-07-29', 'Esala Full Moon Poya Day', 'ඇසළ පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-08-26', 'Milad-Un-Nabi (Holy Prophet''s Birthday)', 'නබි නායකතුමාගේ උපන් දිනය', false, '{public,bank,mercantile}'),
  ('2026-08-27', 'Nikini Full Moon Poya Day', 'නිකිණි පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-09-26', 'Binara Full Moon Poya Day', 'බිනර පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-10-25', 'Vap Full Moon Poya Day', 'වප් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-11-08', 'Deepawali Festival Day', 'දීපවාලි උත්සව දිනය', false, '{public,bank}'),
  ('2026-11-24', 'Il Full Moon Poya Day', 'ඉල් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-12-23', 'Unduvap Full Moon Poya Day', 'උඳුවප් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2026-12-25', 'Christmas Day', 'නත්තල් දිනය', false, '{public,bank,mercantile}'),
  ('2027-01-15', 'Tamil Thai Pongal Day', 'දෙමළ තෛපොංගල් දිනය', false, '{public,bank,mercantile}'),
  ('2027-01-22', 'Duruthu Full Moon Poya Day', 'දුරුතු පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-02-04', 'Independence Day', 'ජාතික නිදහස් දිනය', false, '{public,bank,mercantile}'),
  ('2027-02-20', 'Navam Full Moon Poya Day', 'නවම් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-03-06', 'Mahasivarathri Day', 'මහ සිවරාත්‍රි දිනය', false, '{public,bank}'),
  ('2027-03-10', 'Id-Ul-Fitr (Ramazan Festival Day)', 'ඊදුල් ෆිතර් (රාමසාන් උත්සව දිනය)', false, '{public,bank}'),
  ('2027-03-22', 'Medin Full Moon Poya Day', 'මැදින් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-03-26', 'Good Friday', 'මහ සිකුරාදා දිනය', false, '{public,bank}'),
  ('2027-04-13', 'Day prior to Sinhala & Tamil New Year Day', 'සිංහල හා දෙමළ අලුත් අවුරුදු දිනයට පෙර දිනය', false, '{public,bank,mercantile}'),
  ('2027-04-14', 'Sinhala & Tamil New Year Day', 'සිංහල හා දෙමළ අලුත් අවුරුදු දිනය', false, '{public,bank,mercantile}'),
  ('2027-04-20', 'Bak Full Moon Poya Day', 'බක් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-05-01', 'May Day', 'ලෝක කම්කරු දිනය (මැයි දිනය)', false, '{public,bank,mercantile}'),
  ('2027-05-17', 'Id-Ul-Alha (Hadji Festival Day)', 'ඊදුල් අල්හා (හජ්ජි උත්සව දිනය)', false, '{public,bank}'),
  ('2027-05-19', 'Vesak Full Moon Poya Day', 'වෙසක් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-05-20', 'Day following Vesak Full Moon Poya Day', 'වෙසක් පුර පසළොස්වක පොහොය දිනයට පසු දිනය', false, '{public,bank,mercantile}'),
  ('2027-06-18', 'Poson Full Moon Poya Day', 'පොසොන් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-07-18', 'Esala Full Moon Poya Day', 'ඇසළ පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-08-15', 'Milad-Un-Nabi (Holy Prophet''s Birthday)', 'නබි නායකතුමාගේ උපන් දිනය', false, '{public,bank,mercantile}'),
  ('2027-08-16', 'Nikini Full Moon Poya Day', 'නිකිණි පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-09-15', 'Binara Full Moon Poya Day', 'බිනර පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-10-15', 'Vap Full Moon Poya Day', 'වප් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-10-28', 'Deepawali Festival Day', 'දීපවාලි උත්සව දිනය', false, '{public,bank}'),
  ('2027-11-13', 'Il Full Moon Poya Day', 'ඉල් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-12-13', 'Unduvap Full Moon Poya Day', 'උඳුවප් පුර පසළොස්වක පොහොය දිනය', true, '{public,bank}'),
  ('2027-12-25', 'Christmas Day', 'නත්තල් දිනය', false, '{public,bank,mercantile}');
