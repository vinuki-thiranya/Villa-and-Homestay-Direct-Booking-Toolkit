# Guest site themes (overrides MASTER.md)

MASTER.md is the UI UX Pro Max baseline: its rules on hospitality UX and its pre-delivery checklist still apply.
Its palette, fonts and "Liquid Glass" style do **not**. They were generic, so each theme below replaces them,
following the frontend-design skill: the choices come from the place, not from a template. The code source of
truth is `apps/web/src/themes/registry.ts`, with layouts in `apps/web/src/app/s/[site]/guest.css`.

Shared across all three themes:
- **First view (375 × 667):** the place name, a photo or video, and the date search.
- **Trust strip** just below the first view: rating, SLTDA licence, host reply time, deposit and refund terms.
- **One CTA colour per theme**, used only for actions that move a booking forward.
- **Motion:** the calendar sheet, step changes in checkout and the hero video. Nothing animates on load.
- **WCAG AA** for every text pair in light and dark (tested in `src/lib/guest.test.ts`).
- **Dark mode** follows the OS setting.

## Lagoon: coastal villa
- **Subject:** a south-coast villa in the tropical-modernist style, with lime-plaster walls, lagoon water and brass fittings.
- **Palette:**

  | Role | Light | Dark |
  |---|---|---|
  | Lagoon | `#0e5e63` | `#5cc2bb` |
  | Plaster | `#f7faf9` | |
  | Shallows | `#e3f0ee` | |
  | Brass | `#e9b949` | |
  | Ink | `#10262a` | |

- **Type:** Cormorant 500 for display, set large with tight leading; Manrope for text.
- **Signature:** the property name in light serif over the water, with a 2 px brass "horizon" rule under it. The search card overlaps the photo's lower edge.
- **Shape:** soft 18 px corners and pill buttons.

## Jungle: hill-country tea estate
- **Subject:** an Ella or Kandy homestay with tea terraces, canopy shade, turmeric and colonial verandah arches.
- **Palette:**

  | Role | Light | Dark |
  |---|---|---|
  | Tea | `#2e5a3a` | `#8dc39a` |
  | Paper | `#f6f7f2` | |
  | Moss | `#e7ecdf` | |
  | Turmeric | `#d9a21b` | |
  | Ink | `#1a2419` | |

- **Type:** Lora 600, with the property name in italic; Work Sans for text.
- **Signature:** verandah arches. The hero photo is framed in a tall arch, and room photos have arched tops on the cards (never in the full gallery).
- **Shape:** squarer 6 px corners and 6 px buttons.
- **Layout:** the name comes first, then the arch, then the search. On desktop the arch sits to the right.

## Surf: south-coast surf lodge
- **Subject:** a Weligama or Arugam Bay surf lodge: Indian Ocean blue, foam and tuk-tuk yellow.
- **Palette:**

  | Role | Light | Dark |
  |---|---|---|
  | Ocean | `#0a4a7a` | `#6ab3ec` |
  | Foam | `#f8fbfd` | |
  | Spray | `#e6f0f7` | |
  | Tuk-tuk yellow | `#ffc72c` (the CTA) | |
  | Ink | `#0b1b2b` | |

- **Type:** Barlow Condensed 800 for the name, set huge and stacked; Barlow for text.
- **Signature:** the search sits on a band of tuk-tuk yellow with a cut top edge, like a board's rail. Book buttons are yellow with ink text.
- **Shape:** 10 px corners.

## Replacing a theme with a Claude Design handoff
1. Put the handoff's tokens into that theme's entry in `registry.ts` (both palettes, fonts, radius, CTA colour).
   - Fonts must be added to `themes/fonts.ts` and to `THEME_FONTS` in shared.
2. Replace that theme's block in `guest.css`. Keep the class hooks: `g-hero-media`, `g-name`, `g-search`, `g-search-wrap`, `g-cta`, `g-room-media`.
3. Run these and check the theme:
   - `npm test -w @staydirect/web` for contrast.
   - `npm run screenshots -w @staydirect/web`.
   - `npm run lighthouse -w @staydirect/web`.
