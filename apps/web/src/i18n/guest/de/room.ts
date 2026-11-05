import type { Dict } from '../t';
import type { room as en } from '../en/room';

export const room: Dict<typeof en> = {
  metaTitle: '{room} – {name}, {place} — direkt buchen',
  metaDescription: '{room}: bis {n} Personen{beds}. {description}',
  breadcrumb: '{rooms} – {name}',
  minNights: 'Mindestens {n} Nächte',
  inTheRoom: 'Im Zimmer',
  priceNote: 'pro Nacht vor Rabatten',
  checkDates: 'Termine prüfen',
  paused: 'Die Online-Buchung ist pausiert. Schreiben Sie {name} per WhatsApp, um zu buchen.',
  perNight: 'Pro Nacht',
};
