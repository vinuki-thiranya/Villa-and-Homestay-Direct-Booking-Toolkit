import type { Dict } from '../t';
import type { pay as en } from '../en/pay';

export const pay: Dict<typeof en> = {
  heading: 'Wie möchten Sie bezahlen?',
  dueNow: 'Jetzt fällig: {amount}',
  chargedIn: '({approx}). Abgerechnet wird in {currency}; den endgültigen Kurs legt Ihre Bank bzw. Ihr Kartenanbieter fest.',
  notSetUp: 'Die Online-Zahlung ist noch nicht eingerichtet. Der Gastgeber meldet sich per WhatsApp bei Ihnen, um die Anzahlung zu vereinbaren.',
  somewhereElse: 'Zahlung aus einem anderen Land?',
  preparing: 'Sichere Zahlung wird vorbereitet…',
  startFailed: 'Die Zahlung konnte nicht gestartet werden',
  direct: 'Sie zahlen direkt an {property}. Kartendaten geben Sie auf der Seite des Zahlungsanbieters ein – sie erreichen diese Website nie.',
  groups: {
    abroad: 'Zahlung aus dem Ausland',
    india: 'Zahlung aus Indien',
    sri_lanka: 'Zahlung in Sri Lanka',
  },
  options: {
    abroad: {
      payhere: { title: 'Karte', detail: 'Visa oder Mastercard auf der sicheren PayHere-Seite' },
      paypal: { title: 'PayPal', detail: 'PayPal-Guthaben oder beliebige Karte, in USD, EUR oder GBP' },
      bank: { title: 'Überweisung oder Wise', detail: 'Überweisen, dann Beleg hochladen; der Gastgeber bestätigt' },
    },
    india: {
      lankaqr: { title: 'UPI', detail: 'LankaQR-Code mit GPay, PhonePe oder Paytm scannen' },
      payhere: { title: 'Karte', detail: 'Visa oder Mastercard auf der sicheren PayHere-Seite' },
    },
    sri_lanka: {
      payhere: { title: 'Karte, Genie oder FriMi', detail: 'Sri-lankische Karten und Wallets über PayHere' },
      lankaqr: { title: 'LankaQR', detail: 'Mit jeder sri-lankischen Banking-App scannen' },
      bank: { title: 'Überweisung', detail: 'Überweisen, dann Beleg hochladen; der Gastgeber bestätigt' },
    },
  },
  qr: {
    alt: 'LankaQR-Code für {merchant}',
    scan: 'Scannen Sie den Code mit einer UPI- oder sri-lankischen Banking-App und zahlen Sie genau {amount} an {merchant}.',
    note: 'Geben Sie {reference} im Verwendungszweck an.',
    held: 'Ihre Termine sind bis {time} reserviert. Laden Sie unten den Zahlungs-Screenshot hoch, damit der Gastgeber bestätigen kann.',
  },
  bank: {
    accountName: 'Kontoinhaber',
    bank: 'Bank',
    accountNumber: 'Kontonummer',
    branch: 'Filiale',
    amount: 'Betrag',
    reference: 'Verwendungszweck',
    held: 'Ihre Termine sind bis {time} reserviert.',
  },
  paypal: {
    amount: 'Betrag: {amount}',
    loadFailed: 'PayPal konnte nicht geladen werden',
    captureFailed: 'Die PayPal-Zahlung konnte nicht abgeschlossen werden',
    error: 'PayPal hat einen Fehler gemeldet. Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsart.',
  },
  slip: {
    label: 'Zahlungsbeleg oder Screenshot (JPG, PNG, PDF, max. 5 MB)',
    upload: 'Beleg hochladen',
    uploading: 'Wird hochgeladen…',
    failed: 'Hochladen fehlgeschlagen',
    received: 'Danke, Ihr Beleg ist eingegangen. Der Gastgeber bestätigt Ihre Buchung in Kürze, und Sie erhalten eine E-Mail.',
  },
};
