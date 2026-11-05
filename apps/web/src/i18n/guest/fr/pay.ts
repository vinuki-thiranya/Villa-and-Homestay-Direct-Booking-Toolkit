import type { Dict } from '../t';
import type { pay as en } from '../en/pay';

export const pay: Dict<typeof en> = {
  heading: 'Comment souhaitez-vous payer ?',
  dueNow: 'À régler maintenant : {amount}',
  chargedIn: '({approx}). Le paiement est débité en {currency} ; votre banque ou l’émetteur de votre carte fixe le taux final.',
  notSetUp: 'Le paiement en ligne n’est pas encore disponible. L’hôte vous contactera sur WhatsApp pour organiser le versement de l’acompte.',
  somewhereElse: 'Vous payez depuis un autre pays ?',
  preparing: 'Préparation du paiement sécurisé…',
  startFailed: 'Impossible de lancer le paiement',
  direct: 'Vous payez {property} directement. Les données de carte sont saisies sur la page du prestataire de paiement et ne parviennent jamais à ce site.',
  groups: {
    abroad: 'Paiement depuis l’étranger',
    india: 'Paiement depuis l’Inde',
    sri_lanka: 'Paiement au Sri Lanka',
  },
  options: {
    abroad: {
      payhere: { title: 'Carte', detail: 'Visa ou Mastercard sur la page sécurisée PayHere' },
      paypal: { title: 'PayPal', detail: 'Votre solde PayPal ou toute carte, en USD, EUR ou GBP' },
      bank: { title: 'Virement ou Wise', detail: 'Faites le virement, puis envoyez le justificatif ; l’hôte confirme' },
    },
    india: {
      lankaqr: { title: 'UPI', detail: 'Scannez le code LankaQR avec GPay, PhonePe ou Paytm' },
      payhere: { title: 'Carte', detail: 'Visa ou Mastercard sur la page sécurisée PayHere' },
    },
    sri_lanka: {
      payhere: { title: 'Carte, Genie ou FriMi', detail: 'Cartes et portefeuilles sri-lankais sur PayHere' },
      lankaqr: { title: 'LankaQR', detail: 'Scannez avec n’importe quelle appli bancaire sri-lankaise' },
      bank: { title: 'Virement bancaire', detail: 'Faites le virement, puis envoyez le justificatif ; l’hôte confirme' },
    },
  },
  qr: {
    alt: 'Code LankaQR de {merchant}',
    scan: 'Scannez avec une appli UPI ou bancaire sri-lankaise et payez exactement {amount} à {merchant}.',
    note: 'Indiquez {reference} dans le libellé du paiement.',
    held: 'Vos dates sont bloquées jusqu’à {time}. Envoyez ci-dessous la capture d’écran du paiement pour que l’hôte puisse confirmer.',
  },
  bank: {
    accountName: 'Titulaire du compte',
    bank: 'Banque',
    accountNumber: 'Numéro de compte',
    branch: 'Agence',
    amount: 'Montant',
    reference: 'Référence',
    held: 'Vos dates sont bloquées jusqu’à {time}.',
  },
  paypal: {
    amount: 'Montant : {amount}',
    loadFailed: 'Impossible de charger PayPal',
    captureFailed: 'Le paiement PayPal n’a pas pu aboutir',
    error: 'PayPal a signalé une erreur. Veuillez réessayer ou choisir un autre moyen de paiement.',
  },
  slip: {
    label: 'Justificatif ou capture d’écran du paiement (JPG, PNG, PDF, 5 Mo max.)',
    upload: 'Envoyer le justificatif',
    uploading: 'Envoi…',
    failed: 'Échec de l’envoi',
    received: 'Merci, justificatif bien reçu. L’hôte confirmera votre réservation sous peu et vous recevrez un e-mail.',
  },
};
