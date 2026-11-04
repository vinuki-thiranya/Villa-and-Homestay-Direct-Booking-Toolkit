# Owner app in Sinhala (overrides MASTER.md when lang = si)

English stays as it is. When an owner chooses සිංහල, the app switches its text, type, palette and ornament together, so each language feels native rather than translated.

## Type
- **Headings:** Abhaya Libre 700/800, the free revival of FM Abhaya, the newspaper and textbook letterforms Sri Lankans grew up reading.
- **Text and controls:** Noto Sans Sinhala 400/600.
- **Size and spacing:**
  - 17 px base instead of 16 px, with line height 1.7 for text and 1.35 for headings.
  - Vowel signs (පිලි) sit above and below the letters, so lines need the room.
  - No letter-spacing and no truncation: labels wrap.
- **Numbers:** Western digits.
- **Fonts on other surfaces:**
  - Fonts load only when Sinhala text is on screen (unicode-range), so English pages never pay for them.
  - The guest site uses Noto Sans Sinhala as a fallback inside every theme, for owner-written Sinhala text.

## Palette (Kandyan temple murals)

| Role | Light | Dark |
|---|---|---|
| Lacquer (actions, primary buttons) | `#3b2a1e`, white text | `#e5a640`, lacquer text |
| Kumkuma vermilion (headings, focus) | `#9e2a1e` | `#f08f72` |
| Kaha, turmeric ochre (ornament only) | `#c98a24` | `#e5a640` |

Paid (green) and unpaid (red) are unchanged, so a state never changes meaning between languages. That is also why the primary action colour is lacquer, not red.

## Ornament (`apps/web/src/components/owner/motifs.tsx`; Flutter `lib/sinhala.dart`)
- **Liyawela, the vine scroll:** one band under the header.
- **Pala pethi, the lotus petals:** a divider between Today's sections.
- **Sandakada pahana, the moonstone:** above the login card and on empty states.

All ornament is decorative (`aria-hidden`) and has no motion. Data screens (lists, calendar, forms) stay clean.

## Voice
- A time-of-day greeting on Today: සුභ උදෑසනක් (good morning), සුභ දහවලක් (good afternoon), සුභ සන්ධ්‍යාවක් (good evening).
- Dates with Sinhala month names (Intl `si-LK`).
- Poya days and public holidays come from the admin-maintained `public_holiday` table. Today shows "Poya day: no alcohol sold or served" in both languages.

Terms: `apps/web/src/i18n/owner/GLOSSARY.md`.
