import type { Dict } from '../t';
import type { rooms as en } from '../en/rooms';

export const rooms: Dict<typeof en> = {
  metaTitle: '{name}, {place}: Zimmer direkt buchen',
  metaDescription: '{n} Zimmer in {name}, {type} in {place}. Betten, Ausstattung und Preise im Vergleich.',
  title: 'Zimmer',
  intro: 'Preise pro Nacht, vor Langzeit- und Last-Minute-Rabatten.',
  sleeps: 'Bis {n} Personen',
  aNight: 'pro Nacht',
  book: 'Buchen',
  bookRoom: '{room} buchen',
  photosOf: 'Fotos von {name}',
  slide: '{i} von {n}',
  prevPhoto: 'Vorheriges Foto',
  nextPhoto: 'Nächstes Foto',
  photoOf: 'Foto {i} von {n}',
  photoAlt: '{name}, Foto {i}',
};
