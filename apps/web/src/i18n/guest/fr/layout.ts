import type { Dict } from '../t';
import type { layout as en } from '../en/layout';

export const layout: Dict<typeof en> = {
  skip: 'Aller au contenu',
  mainNav: 'Principal',
  siteNav: 'Site',
  menu: 'Menu',
  rooms: 'Chambres',
  experiences: 'Expériences',
  thingsToDo: 'À faire',
  location: 'Accès',
  contact: 'Contact',
  book: 'Réserver',
  bookYourStay: 'Réservez votre séjour',
  currency: 'Devise',
  sltda: 'Enregistrement SLTDA {number}',
  checkInFrom: 'Arrivée à partir de {time}',
  checkOutBy: 'Départ jusqu’à {time}',
  privacy: 'Politique de confidentialité',
  managedBy: 'Géré par {brand}',
  poweredBy: 'Propulsé par {brand}',
  waText: 'Bonjour {name}, j’ai une question au sujet d’un séjour.',
  waLabel: 'Écrire à {name} sur WhatsApp',
};
