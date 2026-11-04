/*
 * Guest-site themes (docs/plan.md §9, design-system/staydirect-guest/). A theme is a palette for light
 * and dark, a font pair and a few layout choices that guest.css keys on [data-theme]. To drop in a
 * Claude Design handoff, replace that theme's entry here and its block in app/s/[site]/guest.css.
 *
 * Kept free of runtime imports from @staydirect/shared so the guest bundle does not pull in zod.
 */

export const THEME_KEYS = ['lagoon', 'jungle', 'surf'] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

/** Mirrors THEME_FONTS in packages/shared/src/enums.ts. */
export const THEME_FONTS = ['cormorant', 'manrope', 'lora', 'work-sans', 'barlow-condensed', 'barlow'] as const;
export type ThemeFont = (typeof THEME_FONTS)[number];

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  fg: string;
  muted: string;
  border: string;
  brand: string;
  brandStrong: string;
  brandFg: string;
  accent: string;
  accentFg: string;
  ok: string;
  okBg: string;
  bad: string;
  badBg: string;
  warn: string;
  warnBg: string;
  /** Focus outline; must reach 3:1 against bg and surface. */
  ring: string;
}

export interface GuestTheme {
  key: ThemeKey;
  name: string;
  light: Palette;
  dark: Palette;
  fonts: { display: ThemeFont; sans: ThemeFont };
  radius: string;
  /** Which colour carries the main call to action. */
  cta: 'brand' | 'accent';
}

const STATUS_LIGHT = { ok: '#15803d', okBg: '#dcfce7', bad: '#b91c1c', badBg: '#fee2e2', warn: '#92400e', warnBg: '#fef3c7' };
const STATUS_DARK = { ok: '#4ade80', okBg: '#10301e', bad: '#f87171', badBg: '#3a1515', warn: '#facc15', warnBg: '#3a2f0a' };

export const THEMES: Record<ThemeKey, GuestTheme> = {
  // Coastal villa: lagoon water, lime-plaster walls, brass fittings.
  lagoon: {
    key: 'lagoon',
    name: 'Lagoon',
    light: {
      bg: '#f7faf9', surface: '#ffffff', surface2: '#e3f0ee', fg: '#10262a', muted: '#4a6063', border: '#d3e2df',
      brand: '#0e5e63', brandStrong: '#08474b', brandFg: '#ffffff', accent: '#e9b949', accentFg: '#10262a', ring: '#0e5e63',
      ...STATUS_LIGHT,
    },
    dark: {
      bg: '#0a1a1c', surface: '#0f2427', surface2: '#143033', fg: '#e4f0ee', muted: '#9bb4b1', border: '#22403f',
      brand: '#5cc2bb', brandStrong: '#86d7d0', brandFg: '#04201f', accent: '#e9b949', accentFg: '#10262a', ring: '#e9b949',
      ...STATUS_DARK,
    },
    fonts: { display: 'cormorant', sans: 'manrope' },
    radius: '18px',
    cta: 'brand',
  },
  // Hill-country tea estate: tea leaf, canopy shade, turmeric, verandah arches.
  jungle: {
    key: 'jungle',
    name: 'Jungle',
    light: {
      bg: '#f6f7f2', surface: '#ffffff', surface2: '#e7ecdf', fg: '#1a2419', muted: '#4f5b4c', border: '#d8ddcd',
      brand: '#2e5a3a', brandStrong: '#1d3d27', brandFg: '#ffffff', accent: '#d9a21b', accentFg: '#1a2419', ring: '#2e5a3a',
      ...STATUS_LIGHT,
    },
    dark: {
      bg: '#0e150f', surface: '#142016', surface2: '#1a2a1c', fg: '#e8eee3', muted: '#a1b09d', border: '#2a3b2c',
      brand: '#8dc39a', brandStrong: '#aad7b4', brandFg: '#0b1f10', accent: '#e5b43a', accentFg: '#1a2419', ring: '#e5b43a',
      ...STATUS_DARK,
    },
    fonts: { display: 'lora', sans: 'work-sans' },
    radius: '6px',
    cta: 'brand',
  },
  // South-coast surf lodge: Indian Ocean blue, foam, tuk-tuk yellow.
  surf: {
    key: 'surf',
    name: 'Surf',
    light: {
      bg: '#f8fbfd', surface: '#ffffff', surface2: '#e6f0f7', fg: '#0b1b2b', muted: '#46596b', border: '#d3e0ea',
      brand: '#0a4a7a', brandStrong: '#06355a', brandFg: '#ffffff', accent: '#ffc72c', accentFg: '#0b1b2b', ring: '#0a4a7a',
      ...STATUS_LIGHT,
    },
    dark: {
      bg: '#06121d', surface: '#0b1c2b', surface2: '#11273b', fg: '#e7f0f7', muted: '#9ab0c3', border: '#1e3a53',
      brand: '#6ab3ec', brandStrong: '#95caf3', brandFg: '#04192b', accent: '#ffc72c', accentFg: '#0b1b2b', ring: '#ffc72c',
      ...STATUS_DARK,
    },
    fonts: { display: 'barlow-condensed', sans: 'barlow' },
    radius: '10px',
    cta: 'accent',
  },
};

export function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === 'string' && (THEME_KEYS as readonly string[]).includes(v);
}

export function isThemeFont(v: unknown): v is ThemeFont {
  return typeof v === 'string' && (THEME_FONTS as readonly string[]).includes(v);
}

// ---------------------------------------------------------------- contrast (WCAG 2.x)
const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(v: unknown): v is string {
  return typeof v === 'string' && HEX.test(v);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour for a filled button in an owner-chosen colour: whichever of white or ink reads better. */
export function textOn(hex: string, ink = '#0b1b2b'): string {
  return contrast(hex, '#ffffff') >= contrast(hex, ink) ? '#ffffff' : ink;
}

/** Text/background pairs a palette must keep at AA (4.5:1), and non-text pairs at 3:1. */
export function contrastChecks(p: Palette): { pair: string; ratio: number; min: number }[] {
  const text: [string, string, string][] = [
    ['fg on bg', p.fg, p.bg],
    ['fg on surface', p.fg, p.surface],
    ['fg on surface2', p.fg, p.surface2],
    ['muted on bg', p.muted, p.bg],
    ['muted on surface', p.muted, p.surface],
    ['muted on surface2', p.muted, p.surface2],
    ['brand on bg', p.brand, p.bg],
    ['brand on surface', p.brand, p.surface],
    ['brandFg on brand', p.brandFg, p.brand],
    ['brandFg on brandStrong', p.brandFg, p.brandStrong],
    ['accentFg on accent', p.accentFg, p.accent],
    ['ok on okBg', p.ok, p.okBg],
    ['bad on badBg', p.bad, p.badBg],
    ['warn on warnBg', p.warn, p.warnBg],
  ];
  const ui: [string, string, string][] = [
    ['ring on bg', p.ring, p.bg],
    ['ring on surface', p.ring, p.surface],
  ];
  return [
    ...text.map(([pair, a, b]) => ({ pair, ratio: contrast(a, b), min: 4.5 })),
    ...ui.map(([pair, a, b]) => ({ pair, ratio: contrast(a, b), min: 3 })),
  ];
}

// ---------------------------------------------------------------- CSS
const VARS: [keyof Palette, string][] = [
  ['bg', '--bg'], ['surface', '--surface'], ['surface2', '--surface-2'], ['fg', '--fg'], ['muted', '--muted'],
  ['border', '--border'], ['brand', '--brand'], ['brandStrong', '--brand-strong'], ['brandFg', '--brand-fg'],
  ['accent', '--accent'], ['accentFg', '--accent-fg'], ['ok', '--ok'], ['okBg', '--ok-bg'], ['bad', '--bad'],
  ['badBg', '--bad-bg'], ['warn', '--warn'], ['warnBg', '--warn-bg'], ['ring', '--ring'],
];

export interface ThemeOverrides {
  /** Admin theme-editor tokens (light mode). */
  tokens?: Record<string, string> | null;
  /** White-label brand colours (Manager plan, light mode). */
  brand?: { primaryColor: string | null; accentColor: string | null } | null;
}

/** The light palette after admin tokens and white-label colours, with button text re-derived for contrast. */
export function resolvePalette(theme: GuestTheme, o: ThemeOverrides = {}): Palette {
  const p = { ...theme.light };
  const t = o.tokens ?? {};
  if (isHex(t.brand)) p.brand = p.ring = t.brand;
  if (isHex(t.brandStrong)) p.brandStrong = t.brandStrong;
  if (isHex(t.accent)) p.accent = t.accent;
  if (isHex(t.bg)) p.bg = t.bg;
  if (isHex(t.surface2)) p.surface2 = t.surface2;
  if (isHex(o.brand?.primaryColor)) p.brand = p.brandStrong = p.ring = o.brand!.primaryColor!;
  if (isHex(o.brand?.accentColor)) p.accent = o.brand!.accentColor!;
  if (p.brand !== theme.light.brand) p.brandFg = textOn(p.brand, p.fg);
  if (p.accent !== theme.light.accent) p.accentFg = textOn(p.accent, p.fg);
  return p;
}

export function resolveFonts(theme: GuestTheme, tokens?: Record<string, string> | null): { display: ThemeFont; sans: ThemeFont } {
  return {
    display: isThemeFont(tokens?.fontDisplay) ? tokens.fontDisplay : theme.fonts.display,
    sans: isThemeFont(tokens?.fontSans) ? tokens.fontSans : theme.fonts.sans,
  };
}

function block(p: Palette): string {
  return VARS.map(([k, v]) => `${v}:${p[k]};`).join('');
}

/**
 * The CSS for one site: `.g-site` variables for light, then dark mode from the OS setting. Every value
 * is a validated hex colour, a pixel radius or a fixed font stack, so the string is safe to inline.
 */
export function themeCss(theme: GuestTheme, o: ThemeOverrides, fontStack: (f: ThemeFont) => string): string {
  const light = resolvePalette(theme, o);
  const fonts = resolveFonts(theme, o.tokens);
  const radius = /^\d{1,2}px$/.test(o.tokens?.radius ?? '') ? o.tokens!.radius! : theme.radius;
  const common = `--radius:${radius};--g-display:${fontStack(fonts.display)};--g-sans:${fontStack(fonts.sans)};`;
  return (
    `.g-site{${common}${block(light)}color-scheme:light;}` +
    `@media (prefers-color-scheme: dark){.g-site{${block(theme.dark)}color-scheme:dark;}}`
  );
}
