import type { Dict } from '../t';
import type { invoices as en } from '../en/invoices';

export const invoices: Dict<typeof en> = {
  title: 'Factures',
  visaTitle: 'Facture pour le renouvellement de votre visa',
  visaHint: 'Ces factures attestent de votre séjour et de votre adresse, comme le demandent les services d’immigration du Sri Lanka pour renouveler un Digital Nomad Visa.',
  download: 'Télécharger la facture {number} en PDF',
};
