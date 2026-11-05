-- Guest privacy: export, erasure and retention (spec §3.12, §5, §6 Retention; docs/plan.md §11).
--
-- PrivacyService anonymises a guest on request, and a daily job deletes guest messages after 24
-- months and anonymises guests 36 months after their last stay. Money rows (payment, invoice,
-- ledger) are kept for 7 years by law and are never edited: their append-only triggers stay on.

-- The owner marks a repeat guest whose profile should be kept past 36 months (spec §6).
alter table guest add column keep_profile boolean not null default false;

-- The retention job looks up old messages and guests' message rows.
create index if not exists message_created_idx on message (created_at);
create index if not exists message_guest_idx on message (guest_id) where guest_id is not null;
create index if not exists message_booking_idx on message (booking_id) where booking_id is not null;
create index if not exists booking_guest_idx on booking (guest_id);
