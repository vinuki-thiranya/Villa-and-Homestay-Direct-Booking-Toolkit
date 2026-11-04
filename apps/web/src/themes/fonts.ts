import { Barlow, Barlow_Condensed, Cormorant, Lora, Manrope, Work_Sans } from 'next/font/google';
import type { ThemeFont } from './registry';

/*
 * Guest-site fonts, self-hosted by next/font at build time (no request to Google from the guest).
 * None are preloaded: the hero image is the largest paint, and a site only downloads the two files its
 * theme uses. Size-adjusted fallbacks keep layout shift near zero while they swap in. Only the weights
 * the themes use are shipped (body 400/600, display 500–800): static files are far smaller than the
 * full variable fonts on slow 4G.
 */
const cormorant = Cormorant({ subsets: ['latin'], weight: ['500', '600'], display: 'swap', preload: false, variable: '--f-cormorant' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-manrope' });
const lora = Lora({ subsets: ['latin'], weight: ['600'], style: ['normal', 'italic'], display: 'swap', preload: false, variable: '--f-lora' });
const workSans = Work_Sans({ subsets: ['latin'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-work-sans' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '800'], display: 'swap', preload: false, variable: '--f-barlow-condensed' });
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '600'], display: 'swap', preload: false, variable: '--f-barlow' });

/** Class names that define every --f-* variable; a font file is only fetched once text uses it. */
export const FONT_VARIABLES = [cormorant, manrope, lora, workSans, barlowCondensed, barlow].map((f) => f.variable).join(' ');

export const FONT_STACK: Record<ThemeFont, string> = {
  cormorant: 'var(--f-cormorant), ui-serif, Georgia, serif',
  manrope: 'var(--f-manrope), ui-sans-serif, system-ui, sans-serif',
  lora: 'var(--f-lora), ui-serif, Georgia, serif',
  'work-sans': 'var(--f-work-sans), ui-sans-serif, system-ui, sans-serif',
  'barlow-condensed': 'var(--f-barlow-condensed), ui-sans-serif, system-ui, sans-serif',
  barlow: 'var(--f-barlow), ui-sans-serif, system-ui, sans-serif',
};
