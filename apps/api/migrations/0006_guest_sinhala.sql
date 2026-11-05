-- Sinhala as a guest language (guest site, emails, WhatsApp inside the 24-hour window, quick replies,
-- translation overrides). The guest/conversation language columns are unconstrained already.

alter table quick_reply drop constraint quick_reply_language_check;
alter table quick_reply add constraint quick_reply_language_check check (language in ('en', 'de', 'fr', 'hi', 'si'));

alter table translation drop constraint translation_lang_check;
alter table translation add constraint translation_lang_check check (lang in ('en', 'de', 'fr', 'hi', 'si'));
