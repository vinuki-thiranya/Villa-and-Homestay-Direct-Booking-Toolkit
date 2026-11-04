/*
 * Traditional Sinhala ornament for the Sinhala owner app (design-system/staydirect-owner/pages/sinhala.md):
 * liyawela (vine scroll), pala pethi (lotus petals) and sandakada pahana (moonstone). Small inline SVG,
 * drawn in the kaha (turmeric ochre) of Kandyan temple murals, decorative only: aria-hidden, no motion.
 * Each renders nothing unless the owner app is in Sinhala, so callers can place them unconditionally.
 */
import type { OwnerLang } from '@/i18n/owner/t';

/** A running vine scroll: one band under the owner header. */
export function Liyawela({ lang }: { lang: OwnerLang }) {
  if (lang !== 'si') return null;
  return (
    <svg aria-hidden className="block h-3.5 w-full" preserveAspectRatio="none">
      <defs>
        <pattern id="liyawela" width="48" height="14" patternUnits="userSpaceOnUse">
          {/* the vine: one S-curve per tile */}
          <path d="M0 7 C 8 0.5, 16 0.5, 24 7 S 40 13.5, 48 7" fill="none" stroke="var(--si-ochre)" strokeWidth="1.2" />
          {/* a curl at each crest and trough */}
          <path d="M12 3.2 c 2.6 -1.4 4.4 1.4 2.2 2.6 c -1.4 0.8 -2.4 -0.6 -1.2 -1.3" fill="none" stroke="var(--si-ochre)" strokeWidth="1" />
          <path d="M36 10.8 c -2.6 1.4 -4.4 -1.4 -2.2 -2.6 c 1.4 -0.8 2.4 0.6 1.2 1.3" fill="none" stroke="var(--si-ochre)" strokeWidth="1" />
          {/* leaves */}
          <path d="M22 6 q 3 -4.5 7 -4 q -2 4 -7 4 z" fill="var(--si-ochre)" />
          <path d="M26 8 q -3 4.5 -7 4 q 2 -4 7 -4 z" fill="var(--si-ochre)" opacity="0.75" />
        </pattern>
      </defs>
      <rect width="100%" height="14" fill="url(#liyawela)" />
    </svg>
  );
}

/** A row of lotus petals between sections of Today. */
export function PalaPethi({ lang, className = '' }: { lang: OwnerLang; className?: string }) {
  if (lang !== 'si') return null;
  return (
    <svg aria-hidden className={`block h-3 w-full ${className}`} preserveAspectRatio="none">
      <defs>
        <pattern id="pala-pethi" width="16" height="12" patternUnits="userSpaceOnUse">
          <path d="M8 1 C 12.5 4.5, 13.5 9, 8 11.5 C 2.5 9, 3.5 4.5, 8 1 Z" fill="var(--si-ochre)" opacity="0.85" />
          <path d="M8 4 C 9.8 6, 10 8.4, 8 10 C 6 8.4, 6.2 6, 8 4 Z" fill="var(--bg)" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill="url(#pala-pethi)" />
    </svg>
  );
}

/**
 * Sandakada pahana: the half-moonstone at a temple threshold (rings of flame, petals and a lotus at the
 * centre). On the login screen and on empty states.
 */
export function Sandakada({ lang, className = '' }: { lang: OwnerLang; className?: string }) {
  if (lang !== 'si') return null;
  const cx = 80;
  const cy = 80;
  // petals on the ring between r=46 and r=58
  const petals = Array.from({ length: 15 }, (_, i) => {
    const a = Math.PI - (i + 0.5) * (Math.PI / 15);
    const x = cx + Math.cos(a) * 52;
    const y = cy - Math.sin(a) * 52;
    const deg = 90 - (a * 180) / Math.PI;
    return <ellipse key={i} cx={x} cy={y} rx="3.2" ry="6" transform={`rotate(${deg} ${x} ${y})`} fill="var(--si-ochre)" opacity="0.8" />;
  });
  // flame tongues on the outer ring
  const flames = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI - (i + 0.5) * (Math.PI / 21);
    const x1 = cx + Math.cos(a) * 66;
    const y1 = cy - Math.sin(a) * 66;
    const x2 = cx + Math.cos(a) * 75;
    const y2 = cy - Math.sin(a) * 75;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--si-vermilion)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />;
  });
  const arc = (r: number) => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg aria-hidden viewBox="0 0 160 82" className={`block h-auto w-40 ${className}`}>
      {flames}
      {[62, 44, 30].map((r) => (
        <path key={r} d={arc(r)} fill="none" stroke="var(--si-ochre)" strokeWidth="1.3" />
      ))}
      {petals}
      {/* the lotus at the centre */}
      {[-50, -25, 0, 25, 50].map((d) => (
        <ellipse key={d} cx={cx} cy={cy - 12} rx="4.5" ry="12" transform={`rotate(${d} ${cx} ${cy})`} fill="var(--si-vermilion)" opacity="0.8" />
      ))}
      <path d={`M ${cx - 80} ${cy} H ${cx + 80}`} stroke="var(--si-ochre)" strokeWidth="1.3" />
    </svg>
  );
}
