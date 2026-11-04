# Sinhala (owner apps and guest sites)

Sinhala uses the same look as English, with no extra colours or ornament. Only the text and the font change.

- **Fonts:** Abhaya Libre for headings (the free revival of FM Abhaya) and Noto Sans Sinhala for everything else.
  - They load only when Sinhala text is on screen (unicode-range), so English pages never pay for them.
  - On guest sites every theme keeps its own Latin fonts. Sinhala glyphs fall back to Abhaya Libre in the serif themes (Lagoon, Jungle) and to Noto Sans Sinhala in Surf.
- **Size and spacing:**
  - Owner app: 17 px base and line height 1.7 for text.
  - Headings: line height about 1.3, because the tight leading of the display themes would clip the vowel signs (පිලි) above and below the letters.
  - No letter-spacing, and labels wrap instead of being cut off.
- **Numbers and dates:** Western digits. Dates use modern month names (ජනවාරි… / ජන…), not ICU's traditional ones, which are also the Poya names.
- **Language switch:** a button labelled in the other language (සිං / EN) in the header.
- **Words:** see `apps/web/src/i18n/owner/GLOSSARY.md`.
