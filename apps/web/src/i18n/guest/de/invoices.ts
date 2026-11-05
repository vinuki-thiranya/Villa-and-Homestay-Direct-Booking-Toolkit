import type { Dict } from '../t';
import type { invoices as en } from '../en/invoices';

export const invoices: Dict<typeof en> = {
  title: 'Rechnungen',
  visaTitle: 'Rechnung für Ihre Visumverlängerung',
  visaHint: 'Diese Rechnungen bestätigen Ihren Aufenthalt und Ihre Adresse, wie es die Einwanderungsbehörde von Sri Lanka bei der Verlängerung eines Digital Nomad Visa verlangt.',
  download: 'Rechnung {number} als PDF herunterladen',
};
