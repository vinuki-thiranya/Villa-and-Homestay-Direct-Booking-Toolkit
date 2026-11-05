-- Release 4 (spec §12 Prompt 5): guest booking site redesign.
-- No money tables are touched.

-- Looping hero video; photos[0] stays the poster and the reduced-motion fallback.
alter table property add column hero_video_url text check (hero_video_url is null or hero_video_url like 'https://%');

-- The three guest themes, redesigned (docs/plan.md §9). Admins can still edit them in the theme editor;
-- fontDisplay/fontSans must be one of THEME_FONTS (packages/shared/src/enums.ts).
update theme set tokens = '{"brand":"#0e5e63","brandStrong":"#08474b","accent":"#e9b949","bg":"#f7faf9","surface2":"#e3f0ee","radius":"18px","fontDisplay":"cormorant","fontSans":"manrope"}'
  where key = 'lagoon';
update theme set tokens = '{"brand":"#2e5a3a","brandStrong":"#1d3d27","accent":"#d9a21b","bg":"#f6f7f2","surface2":"#e7ecdf","radius":"6px","fontDisplay":"lora","fontSans":"work-sans"}'
  where key = 'jungle';
update theme set tokens = '{"brand":"#0a4a7a","brandStrong":"#06355a","accent":"#ffc72c","bg":"#f8fbfd","surface2":"#e6f0f7","radius":"10px","fontDisplay":"barlow-condensed","fontSans":"barlow"}'
  where key = 'surf';

-- Response-time lookups for the guest site (median first reply per inbound message).
create index if not exists message_property_created_idx on message (property_id, created_at) where conversation_id is not null;
