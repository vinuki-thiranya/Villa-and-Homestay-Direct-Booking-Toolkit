import { Abhaya_Libre, Barlow, Barlow_Condensed, Cormorant, Lora, Manrope, Noto_Sans_Devanagari, Noto_Sans_Sinhala, Work_Sans } from 'next/font/google';
import type { ThemeFont } from './registry';

/*
 * Guest-site fonts, self-hosted by next/font at build time (no request to Google from the guest).
 * None are preloaded: the hero image is the largest paint, and a site only downloads the two files its
 * theme uses. Size-adjusted fallbacks keep layout shift near zero while they swap in. Only the weights
 * the themes use are shipped (body 400/600, display 500–800): static files are far smaller than the
 * full variable fonts on slow 4G. 'latin-ext' covers German and French letters outside Latin-1 (œ, ẞ);
 * like every subset it is a separate file fetched only when such a letter is on the page.
 */
const cormorant = Cormorant({ subsets: ['latin', 'latin-ext'], weight: ['500', '600'], display: 'swap', preload: false, variable: '--f-cormorant' });
const manrope = Manrope({ subsets: ['latin', 'latin-ext'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-manrope' });
const lora = Lora({ subsets: ['latin', 'latin-ext'], weight: ['600'], style: ['normal', 'italic'], display: 'swap', preload: false, variable: '--f-lora' });
const workSans = Work_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-work-sans' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin', 'latin-ext'], weight: ['600', '800'], display: 'swap', preload: false, variable: '--f-barlow-condensed' });
const barlow = Barlow({ subsets: ['latin', 'latin-ext'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-barlow' });

/*
 * Sinhala. Only the 'sinhala' unicode range is declared, so these download only when a page shows
 * Sinhala text (an owner's description, a review, the Sinhala owner app); English pages never fetch them.
 * Abhaya Libre is the free revival of FM Abhaya, the newspaper and textbook face Sri Lankans grew up
 * reading; Noto Sans Sinhala stays crisp at small sizes for body text and buttons.
 */
const notoSinhala = Noto_Sans_Sinhala({ subsets: ['sinhala'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-sinhala' });
const abhaya = Abhaya_Libre({ subsets: ['sinhala'], weight: ['700', '800'], display: 'swap', preload: false, variable: '--f-abhaya' });

/** Hindi pages (/hi): Devanagari, fetched the same way, only when the page has Devanagari text. */
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-devanagari' });

/** Class names that define every --f-* variable; a font file is only fetched once text uses it. */
export const FONT_VARIABLES = [cormorant, manrope, lora, workSans, barlowCondensed, barlow, notoSinhala, abhaya, notoDevanagari].map((f) => f.variable).join(' ');

/**
 * Each Latin face falls back per glyph for Sinhala characters: serif faces to Abhaya Libre (a serif
 * Sinhala), sans faces to Noto Sans Sinhala; Devanagari to Noto Sans Devanagari. So every theme keeps
 * its look and only the font changes.
 */
export const FONT_STACK: Record<ThemeFont, string> = {
  cormorant: 'var(--f-cormorant), var(--f-abhaya), var(--f-sinhala), var(--f-devanagari), ui-serif, Georgia, serif',
  manrope: 'var(--f-manrope), var(--f-sinhala), var(--f-devanagari), ui-sans-serif, system-ui, sans-serif',
  lora: 'var(--f-lora), var(--f-abhaya), var(--f-sinhala), var(--f-devanagari), ui-serif, Georgia, serif',
  'work-sans': 'var(--f-work-sans), var(--f-sinhala), var(--f-devanagari), ui-sans-serif, system-ui, sans-serif',
  'barlow-condensed': 'var(--f-barlow-condensed), var(--f-sinhala), var(--f-devanagari), ui-sans-serif, system-ui, sans-serif',
  barlow: 'var(--f-barlow), var(--f-sinhala), var(--f-devanagari), ui-sans-serif, system-ui, sans-serif',
};
