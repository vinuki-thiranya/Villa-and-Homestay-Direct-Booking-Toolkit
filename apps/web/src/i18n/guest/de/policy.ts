import type { Dict } from '../t';
import type { policy as en } from '../en/policy';

export const policy: Dict<typeof en> = {
  title: 'Stornobedingungen',
  flexible: 'Volle Rückerstattung, wenn Sie mindestens 7 Tage vor Anreise stornieren. Danach erfolgt keine Rückerstattung.',
  moderate: '50% Rückerstattung, wenn Sie mindestens 14 Tage vor Anreise stornieren. Danach erfolgt keine Rückerstattung.',
  strict: 'Die Anzahlung wird nicht erstattet. Jeder über die Anzahlung hinaus gezahlte Betrag wird erstattet.',
  violations: {
    min_nights: 'Mindestaufenthalt für diese Termine: {n} Nächte',
    max_nights: 'Der Aufenthalt ist länger, als dieses Zimmer erlaubt',
    max_guests: 'Zu viele Gäste für dieses Zimmer',
    closed_to_arrival: 'An diesem Tag ist keine Anreise möglich',
    closed_to_departure: 'An diesem Tag ist keine Abreise möglich',
    in_the_past: 'Das Anreisedatum liegt in der Vergangenheit',
    invalid_dates: 'Die Abreise muss nach der Anreise liegen',
    unavailable: 'Für diese Termine ausgebucht',
    other: 'Nicht verfügbar',
  },
};
