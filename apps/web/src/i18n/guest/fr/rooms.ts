import type { Dict } from '../t';
import type { rooms as en } from '../en/rooms';

export const rooms: Dict<typeof en> = {
  metaTitle: 'Chambres de {name}, {place} — en direct',
  metaDescription: '{n} chambres chez {name} ({type} à {place}). Comparez lits, équipements et prix.',
  title: 'Chambres',
  intro: 'Prix par nuit, avant remises longue durée et de dernière minute.',
  sleeps: 'Jusqu’à {n} pers.',
  aNight: 'la nuit',
  book: 'Réserver',
  bookRoom: 'Réserver {room}',
  photosOf: 'Photos de {name}',
  slide: '{i} sur {n}',
  prevPhoto: 'Photo précédente',
  nextPhoto: 'Photo suivante',
  photoOf: 'Photo {i} sur {n}',
  photoAlt: '{name}, photo {i}',
};
