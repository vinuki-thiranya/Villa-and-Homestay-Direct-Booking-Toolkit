import type { Language } from './enums.js';

/** Guest-facing transactional strings (confirmation email/WhatsApp). Placeholders: {name}, {property}, … */
const STRINGS = {
  en: {
    confirmedSubject: 'Your stay at {property} is confirmed — {reference}',
    requestSubject: 'We received your request for {property} — {reference}',
    greeting: 'Dear {name},',
    confirmedIntro: 'Thank you for booking direct. Your stay is confirmed.',
    requestIntro: 'Thank you. The host will reply within 12 hours. You will receive a payment link once approved.',
    dates: 'Dates',
    room: 'Room',
    guests: 'Guests',
    paid: 'Paid',
    balance: 'Balance due',
    balanceBy: 'by {date}',
    checkIn: 'Check-in from {time}',
    checkOut: 'Check-out by {time}',
    directions: 'Directions on Google Maps',
    whatsappHost: 'Message the host on WhatsApp',
    policy: 'Cancellation policy',
    footer: 'Booked direct with {property}. Powered by StayDirect LK.',
    seqBookingConfirmed: 'Booking {reference} at {property} is confirmed: {from} → {to}. Your booking page: {link} — just reply here if you need anything.',
    seqPreArrival7d: 'Your stay at {property} starts in a week ({from}). How to get here: {directions}. Any questions? Just reply to this message.',
    seqPreArrival1d: 'See you tomorrow at {property}! Check-in from {checkIn}. Address: {address}. Directions: {directions} — safe travels!',
    seqArrival: 'Welcome to {property}! Your house guide with Wi-Fi, house rules and local tips: {guide} — enjoy your stay.',
    seqMidStay: 'Hope you are enjoying {property}! Airport transfers, surf lessons, safaris and more can be booked here: {addons} — just ask if you need help.',
    seqCheckOut: 'Thank you for staying at {property}. Check-out is by {checkOut}. How was your stay? It takes one minute: {review} — thank you!',
    repeatCode: 'Missing Sri Lanka? Book direct with {property} and save {pct}% with code {code} (valid until {date}): {link} — we would love to host you again.',
  },
  de: {
    confirmedSubject: 'Ihr Aufenthalt in {property} ist bestätigt — {reference}',
    requestSubject: 'Ihre Anfrage für {property} ist eingegangen — {reference}',
    greeting: 'Liebe/r {name},',
    confirmedIntro: 'Vielen Dank für Ihre Direktbuchung. Ihr Aufenthalt ist bestätigt.',
    requestIntro: 'Vielen Dank. Der Gastgeber antwortet innerhalb von 12 Stunden. Nach der Bestätigung erhalten Sie einen Zahlungslink.',
    dates: 'Daten',
    room: 'Zimmer',
    guests: 'Gäste',
    paid: 'Bezahlt',
    balance: 'Restbetrag',
    balanceBy: 'bis {date}',
    checkIn: 'Check-in ab {time}',
    checkOut: 'Check-out bis {time}',
    directions: 'Wegbeschreibung in Google Maps',
    whatsappHost: 'Gastgeber per WhatsApp kontaktieren',
    policy: 'Stornierungsbedingungen',
    footer: 'Direkt gebucht bei {property}. Powered by StayDirect LK.',
    seqBookingConfirmed: 'Buchung {reference} in {property} ist bestätigt: {from} → {to}. Ihre Buchungsseite: {link} – antworten Sie einfach hier bei Fragen.',
    seqPreArrival7d: 'Ihr Aufenthalt in {property} beginnt in einer Woche ({from}). Anreise: {directions}. Fragen? Antworten Sie einfach auf diese Nachricht.',
    seqPreArrival1d: 'Bis morgen in {property}! Check-in ab {checkIn}. Adresse: {address}. Wegbeschreibung: {directions} – gute Reise!',
    seqArrival: 'Willkommen in {property}! Ihr Hausführer mit WLAN, Hausregeln und Tipps: {guide} – genießen Sie Ihren Aufenthalt.',
    seqMidStay: 'Wir hoffen, Sie genießen {property}! Flughafentransfer, Surfkurse, Safaris und mehr buchen Sie hier: {addons} – fragen Sie uns gern.',
    seqCheckOut: 'Danke für Ihren Aufenthalt in {property}. Check-out bis {checkOut}. Wie war es? Es dauert nur eine Minute: {review} – vielen Dank!',
    repeatCode: 'Sri Lanka vermisst? Buchen Sie direkt bei {property} und sparen Sie {pct}% mit dem Code {code} (gültig bis {date}): {link} – wir freuen uns auf Sie.',
  },
  fr: {
    confirmedSubject: 'Votre séjour à {property} est confirmé — {reference}',
    requestSubject: 'Nous avons reçu votre demande pour {property} — {reference}',
    greeting: 'Bonjour {name},',
    confirmedIntro: 'Merci d’avoir réservé en direct. Votre séjour est confirmé.',
    requestIntro: 'Merci. L’hôte répondra sous 12 heures. Vous recevrez un lien de paiement après acceptation.',
    dates: 'Dates',
    room: 'Chambre',
    guests: 'Voyageurs',
    paid: 'Payé',
    balance: 'Solde à régler',
    balanceBy: 'avant le {date}',
    checkIn: 'Arrivée à partir de {time}',
    checkOut: 'Départ avant {time}',
    directions: 'Itinéraire sur Google Maps',
    whatsappHost: 'Écrire à l’hôte sur WhatsApp',
    policy: 'Conditions d’annulation',
    footer: 'Réservé en direct auprès de {property}. Propulsé par StayDirect LK.',
    seqBookingConfirmed: 'La réservation {reference} à {property} est confirmée : {from} → {to}. Votre page de réservation : {link} – répondez ici pour toute question.',
    seqPreArrival7d: 'Votre séjour à {property} commence dans une semaine ({from}). Comment venir : {directions}. Une question ? Répondez simplement à ce message.',
    seqPreArrival1d: 'À demain à {property} ! Arrivée à partir de {checkIn}. Adresse : {address}. Itinéraire : {directions} – bon voyage !',
    seqArrival: 'Bienvenue à {property} ! Votre guide de la maison avec Wi-Fi, règles et bonnes adresses : {guide} – bon séjour.',
    seqMidStay: 'Nous espérons que vous profitez de {property} ! Transferts aéroport, cours de surf, safaris et plus : {addons} – demandez-nous si besoin.',
    seqCheckOut: 'Merci pour votre séjour à {property}. Départ avant {checkOut}. Comment s’est passé votre séjour ? Une minute suffit : {review} – merci !',
    repeatCode: 'Le Sri Lanka vous manque ? Réservez en direct avec {property} et économisez {pct}% avec le code {code} (valable jusqu’au {date}) : {link} – au plaisir de vous revoir.',
  },
  hi: {
    confirmedSubject: '{property} में आपका प्रवास पक्का हो गया है — {reference}',
    requestSubject: '{property} के लिए आपका अनुरोध मिल गया है — {reference}',
    greeting: 'प्रिय {name},',
    confirmedIntro: 'सीधे बुक करने के लिए धन्यवाद। आपका प्रवास पक्का है।',
    requestIntro: 'धन्यवाद। मेज़बान 12 घंटे में जवाब देंगे। स्वीकृति के बाद आपको भुगतान लिंक मिलेगा।',
    dates: 'तारीखें',
    room: 'कमरा',
    guests: 'मेहमान',
    paid: 'भुगतान किया',
    balance: 'बकाया राशि',
    balanceBy: '{date} तक',
    checkIn: 'चेक-इन {time} से',
    checkOut: 'चेक-आउट {time} तक',
    directions: 'Google Maps पर रास्ता',
    whatsappHost: 'मेज़बान को WhatsApp करें',
    policy: 'रद्द करने की नीति',
    footer: '{property} के साथ सीधे बुक किया गया। StayDirect LK द्वारा संचालित।',
    seqBookingConfirmed: 'आपकी बुकिंग {reference} ({property}) पक्की है: {from} → {to}। आपका बुकिंग पेज: {link} — कोई सवाल हो तो यहीं जवाब दें।',
    seqPreArrival7d: 'आपका प्रवास ({property}) एक हफ़्ते में ({from}) शुरू होगा। यहाँ कैसे पहुँचें: {directions}। कोई सवाल? बस इस संदेश का जवाब दें।',
    seqPreArrival1d: 'कल {property} में मिलते हैं! चेक-इन {checkIn} से। पता: {address}। रास्ता: {directions} — सुरक्षित यात्रा!',
    seqArrival: 'आपका स्वागत है, {property} में! Wi-Fi, नियम और आसपास की जानकारी वाली गाइड: {guide} — आनंद लें।',
    seqMidStay: 'उम्मीद है आप {property} का आनंद ले रहे हैं! एयरपोर्ट ट्रांसफ़र, सर्फ़िंग, सफ़ारी आदि यहाँ बुक करें: {addons} — मदद चाहिए तो पूछें।',
    seqCheckOut: 'ठहरने के लिए धन्यवाद ({property})। चेक-आउट {checkOut} तक। आपका प्रवास कैसा रहा? बस एक मिनट: {review} — धन्यवाद!',
    repeatCode: 'श्रीलंका याद आ रहा है? {property} में सीधे बुक करें और कोड {code} से {pct}% बचाएँ ({date} तक मान्य): {link} — फिर मिलेंगे।',
  },
} satisfies Record<Language, Record<string, string>>;

export type MessageKey = keyof (typeof STRINGS)['en'];

export const MESSAGE_KEYS = Object.keys(STRINGS.en) as MessageKey[];

/** Default text for a key (the admin translation editor shows these next to overrides). */
export function defaultMessage(lang: Language, key: MessageKey): string {
  return (STRINGS as Record<string, Record<MessageKey, string>>)[lang]?.[key] ?? STRINGS.en[key];
}

export function fillMessage(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function t(lang: Language | string, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const table = (STRINGS as Record<string, Record<MessageKey, string>>)[lang] ?? STRINGS.en;
  return table[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
