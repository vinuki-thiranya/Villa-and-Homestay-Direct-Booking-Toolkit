import type { Dict } from '../t';
import type { search as en } from '../en/search';

export const search: Dict<typeof en> = {
  checkIn: 'Anreise',
  checkOut: 'Abreise',
  addDate: 'Datum wählen',
  guests: 'Gäste',
  guestOption_one: '{n} Gast',
  guestOption_other: '{n} Gäste',
  seePrices: 'Preise ansehen',
  calTitle: 'Ihre Reisedaten',
  calLoading: 'Freie Termine werden geladen…',
  calChooseCheckIn: 'Wählen Sie Ihr Anreisedatum',
  calChooseCheckOut: 'Anreise {date}. Wählen Sie jetzt die Abreise.',
  calRange: '{from} bis {to}, {nights}',
  calClose: 'Schließen',
  calClear: 'Zurücksetzen',
  calUse_one: '{n} Nacht übernehmen',
  calUse_other: '{n} Nächte übernehmen',
  calChooseDates: 'Termine wählen',
  dayCheckIn: ', Anreise',
  dayCheckOut: ', Abreise',
  dayBooked: ', belegt',
  /** Monday first, space separated. */
  weekdays: 'Mo Di Mi Do Fr Sa So',
};
