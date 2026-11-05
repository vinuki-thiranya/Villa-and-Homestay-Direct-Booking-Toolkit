import type { Dict } from '../t';
import type { room as en } from '../en/room';

export const room: Dict<typeof en> = {
  metaTitle: '{room} à {name}, {place} — en direct',
  metaDescription: '{room} : jusqu’à {n} pers.{beds}. {description}',
  breadcrumb: '{rooms} de {name}',
  minNights: '{n} nuits minimum',
  inTheRoom: 'Dans la chambre',
  priceNote: 'la nuit, avant remises',
  checkDates: 'Disponibilités',
  paused: 'La réservation en ligne est suspendue. Écrivez à {name} sur WhatsApp pour réserver.',
  perNight: 'Par nuit',
};
