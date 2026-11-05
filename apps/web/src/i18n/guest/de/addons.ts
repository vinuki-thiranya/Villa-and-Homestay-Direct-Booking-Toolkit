import type { Dict } from '../t';
import type { addons as en } from '../en/addons';

export const addons: Dict<typeof en> = {
  title: 'Machen Sie mehr aus Ihrem Aufenthalt',
  qtyDate: '{name} × {qty}, {date}',
  status: {
    requested: 'Angefragt',
    confirmed: 'Bestätigt',
    done: 'Erledigt',
    cancelled: 'Storniert',
  },
  youRated: 'Ihre Bewertung: {n} von 5',
  thisExperience: 'dieses Erlebnis',
  rate: {
    open: 'Bewerten',
    how: 'Wie war {name}?',
    rating: 'Bewertung',
    star_one: '{n} Stern',
    star_other: '{n} Sterne',
    choose: 'Wählen Sie 1 bis 5 Sterne',
    comment: 'Kommentar',
    commentHint: 'Möchten Sie dem Gastgeber etwas mitteilen? (optional)',
    send: 'Bewertung senden',
    sending: 'Wird gesendet…',
    failed: 'Ihre Bewertung konnte nicht gespeichert werden',
  },
  requested: '{name} angefragt. Der Anbieter bestätigt Ihre Anfrage, und der Betrag wird Ihrem Restbetrag hinzugerechnet.',
  orderFailed: 'Die Bestellung konnte nicht aufgegeben werden',
  form: {
    date: 'Datum',
    time: 'Uhrzeit',
    optional: '(optional)',
    qty: 'Menge',
    notes: 'Hinweise',
    notesHint: 'Flugnr., Abholort…',
    leadTime: 'Bitte bestellen Sie mindestens {hours} Stunden im Voraus.',
    request: 'Anfragen',
    ordering: 'Wird bestellt…',
    cancel: 'Abbrechen',
    add: 'Zum Aufenthalt hinzufügen',
  },
};
