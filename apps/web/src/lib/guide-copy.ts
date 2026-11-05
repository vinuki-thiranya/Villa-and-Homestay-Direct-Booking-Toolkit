/** Static labels for the house guide, in every guest message language (EN/DE/FR/HI/SI). */
export type GuestLang = 'en' | 'de' | 'fr' | 'hi' | 'si';

export function guestLang(v: unknown, fallback: GuestLang = 'en'): GuestLang {
  return v === 'en' || v === 'de' || v === 'fr' || v === 'hi' || v === 'si' ? v : fallback;
}

const COPY = {
  en: {
    guide: 'House guide',
    wifi: 'Wi-Fi',
    network: 'Network',
    password: 'Password',
    copy: 'Copy password',
    copied: 'Copied',
    arrival: 'Getting here',
    rules: 'House rules',
    checkout: 'Check-out',
    checkInOut: 'Check-in from {in} · check-out by {out}',
    emergency: 'Emergency numbers',
    places: 'Nearby',
    directions: 'Directions',
    whatsapp: 'Message {host} on WhatsApp',
    host: 'your host',
  },
  de: {
    guide: 'Hausführer',
    wifi: 'WLAN',
    network: 'Netzwerk',
    password: 'Passwort',
    copy: 'Passwort kopieren',
    copied: 'Kopiert',
    arrival: 'Anreise',
    rules: 'Hausregeln',
    checkout: 'Abreise',
    checkInOut: 'Check-in ab {in} · Check-out bis {out}',
    emergency: 'Notrufnummern',
    places: 'In der Nähe',
    directions: 'Route',
    whatsapp: '{host} per WhatsApp schreiben',
    host: 'Gastgeber',
  },
  fr: {
    guide: 'Guide de la maison',
    wifi: 'Wi-Fi',
    network: 'Réseau',
    password: 'Mot de passe',
    copy: 'Copier le mot de passe',
    copied: 'Copié',
    arrival: 'Arrivée',
    rules: 'Règles de la maison',
    checkout: 'Départ',
    checkInOut: 'Arrivée à partir de {in} · départ avant {out}',
    emergency: 'Numéros d’urgence',
    places: 'À proximité',
    directions: 'Itinéraire',
    whatsapp: 'Écrire à {host} sur WhatsApp',
    host: 'votre hôte',
  },
  hi: {
    guide: 'हाउस गाइड',
    wifi: 'Wi-Fi',
    network: 'नेटवर्क',
    password: 'पासवर्ड',
    copy: 'पासवर्ड कॉपी करें',
    copied: 'कॉपी हो गया',
    arrival: 'यहाँ कैसे पहुँचें',
    rules: 'घर के नियम',
    checkout: 'चेक-आउट',
    checkInOut: 'चेक-इन {in} से · चेक-आउट {out} तक',
    emergency: 'आपातकालीन नंबर',
    places: 'आसपास',
    directions: 'रास्ता',
    whatsapp: '{host} को WhatsApp करें',
    host: 'मेज़बान',
  },
  si: {
    guide: 'නිවාස මාර්ගෝපදේශය',
    wifi: 'Wi-Fi',
    network: 'ජාලය',
    password: 'මුරපදය',
    copy: 'මුරපදය පිටපත් කරන්න',
    copied: 'පිටපත් කළා',
    arrival: 'මෙහි එන ආකාරය',
    rules: 'නිවාසයේ නීති',
    checkout: 'පිටවීම',
    checkInOut: '{in} සිට පැමිණිය හැක · {out} ට පෙර පිටවිය යුතුය',
    emergency: 'හදිසි දුරකථන අංක',
    places: 'අවට ස්ථාන',
    directions: 'මාර්ගය',
    whatsapp: '{host} වෙත WhatsApp කරන්න',
    host: 'ඔබගේ සත්කාරකයා',
  },
} satisfies Record<GuestLang, Record<string, string>>;

export type GuideKey = keyof (typeof COPY)['en'];

export function gt(lang: GuestLang, key: GuideKey, vars: Record<string, string> = {}): string {
  return COPY[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

export const PLACE_LABEL: Record<string, string> = {
  restaurant: '🍛',
  cafe: '☕',
  beach: '🏖️',
  atm: '🏧',
  pharmacy: '💊',
  hospital: '🏥',
  supermarket: '🛒',
  sight: '📍',
  other: '📍',
};
