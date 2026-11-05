import type { Dict } from '../t';
import type { search as en } from '../en/search';

export const search: Dict<typeof en> = {
  checkIn: 'Arrivée',
  checkOut: 'Départ',
  addDate: 'Ajouter une date',
  guests: 'Personnes',
  guestOption_one: '{n} personne',
  guestOption_other: '{n} personnes',
  seePrices: 'Voir les prix',
  calTitle: 'Vos dates',
  calLoading: 'Chargement des disponibilités…',
  calChooseCheckIn: 'Choisissez votre date d’arrivée',
  calChooseCheckOut: 'Arrivée le {date}. Choisissez maintenant le départ.',
  calRange: 'Du {from} au {to}, {nights}',
  calClose: 'Fermer',
  calClear: 'Effacer',
  calUse_one: 'Valider {n} nuit',
  calUse_other: 'Valider {n} nuits',
  calChooseDates: 'Choisir les dates',
  dayCheckIn: ', arrivée',
  dayCheckOut: ', départ',
  dayBooked: ', complet',
  /** Monday first, space separated. */
  weekdays: 'Lu Ma Me Je Ve Sa Di',
};
