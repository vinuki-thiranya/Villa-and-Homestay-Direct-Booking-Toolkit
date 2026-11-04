/** Guest-facing copy shared by the book and booking pages (kept out of @staydirect/shared runtime to keep zod off the client). */
export const POLICY_TEXT: Record<string, string> = {
  flexible: 'Full refund if you cancel at least 7 days before arrival. No refund after that.',
  moderate: '50% refund if you cancel at least 14 days before arrival. No refund after that.',
  strict: 'The deposit is non-refundable. Any amount paid above the deposit is refunded.',
};

export function violationText(v: string, minNights?: number): string {
  switch (v) {
    case 'min_nights':
      return `Minimum stay is ${minNights ?? 2} nights for these dates`;
    case 'max_nights':
      return 'Stay is longer than this room allows';
    case 'max_guests':
      return 'Too many guests for this room';
    case 'closed_to_arrival':
      return 'Arrivals are not possible on this date';
    case 'closed_to_departure':
      return 'Departures are not possible on this date';
    case 'in_the_past':
      return 'Check-in date is in the past';
    case 'invalid_dates':
      return 'Check-out must be after check-in';
    case 'unavailable':
      return 'Booked for these dates';
    default:
      return 'Not available';
  }
}

/** Top source markets first (spec §2), then common others. */
export const COUNTRIES: [string, string][] = [
  ['IN', 'India'],
  ['GB', 'United Kingdom'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['AU', 'Australia'],
  ['LK', 'Sri Lanka'],
  ['US', 'United States'],
  ['RU', 'Russia'],
  ['CN', 'China'],
  ['NL', 'Netherlands'],
  ['IT', 'Italy'],
  ['ES', 'Spain'],
  ['CH', 'Switzerland'],
  ['AT', 'Austria'],
  ['BE', 'Belgium'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['DK', 'Denmark'],
  ['PL', 'Poland'],
  ['IL', 'Israel'],
  ['CA', 'Canada'],
  ['NZ', 'New Zealand'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['SG', 'Singapore'],
  ['MY', 'Malaysia'],
  ['MV', 'Maldives'],
  ['AE', 'United Arab Emirates'],
  ['SA', 'Saudi Arabia'],
  ['BD', 'Bangladesh'],
  ['PK', 'Pakistan'],
  ['IE', 'Ireland'],
  ['CZ', 'Czechia'],
  ['UA', 'Ukraine'],
  ['BR', 'Brazil'],
  ['ZA', 'South Africa'],
];

export const LANGUAGES: [string, string][] = [
  ['en', 'English'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['hi', 'हिन्दी'],
];
