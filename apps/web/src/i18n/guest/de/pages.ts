import type { Dict } from '../t';
import type { pages as en } from '../en/pages';

export const pages: Dict<typeof en> = {
  experiences: {
    metaTitle: 'Ausflüge & Transfers in {place} | {name}',
    metaDescription: 'Flughafentransfers, Surfkurse, Walbeobachtung und Safaris mit {name} in {place} buchen. Mit lokalen Guides und Fahrern, denen wir vertrauen.',
    title: 'Erlebnisse & Transfers',
    nearby: 'Aktivitäten rund um {name}',
    bookable: 'Mit Ihrem Aufenthalt buchen',
    intro: 'Organisiert von {host} mit Fahrern und Guides, die wir persönlich kennen. Buchen Sie zuerst Ihren Aufenthalt und fügen Sie diese Angebote dann auf Ihrer Buchungsseite hinzu – oder fragen Sie uns einfach per WhatsApp.',
    empty: 'Fragen Sie uns per WhatsApp nach Transfers und Tagesausflügen.',
    bookYourStay: 'Aufenthalt buchen',
    categories: {
      airport_pickup: 'Flughafentransfer',
      driver: 'Fahrer',
      tuk_tuk: 'Tuk-Tuk',
      surf_lesson: 'Surfen',
      whale_watching: 'Walbeobachtung',
      safari: 'Safari',
      cooking_class: 'Kochkurs',
      laundry: 'Wäscheservice',
      bicycle: 'Fahrrad',
      other: 'Erlebnis',
    },
  },
  location: {
    metaTitle: 'Anreise zu {name}, {place}',
    metaDescription: 'Adresse, Karte und Anfahrt zu {name} in {place}. Check-in ab {in}, Check-out bis {out}.',
    title: 'Lage und Anreise',
    gettingHere: 'Anreise',
    mapTitle: 'Karte von {name}',
    mapSoon: 'Karte folgt in Kürze.',
    directions: 'Route in Google Maps',
    arrival: 'Ankunft',
    arrivalTimes: 'Check-in ab {in}, Check-out bis {out}.',
    arrivalHelp: 'Schreiben Sie dem Gastgeber per WhatsApp Ihre Ankunftszeit – gern organisieren wir eine Abholung vom Flughafen oder Bahnhof.',
    houseRules: 'Hausregeln',
  },
  contact: {
    metaTitle: 'Kontakt – {name}',
    metaDescription: 'Schreiben Sie {name} per WhatsApp oder E-Mail – zu Zimmern, Transfers und Verfügbarkeit.',
    title: '{name} kontaktieren',
    fastest: 'Am schnellsten erreichen Sie {host} per WhatsApp.',
    us: 'uns',
    whatsapp: 'WhatsApp',
    email: 'E-Mail',
  },
  privacy: {
    metaTitle: 'Datenschutzhinweise — {name}',
    title: 'Datenschutzhinweise',
    controller:
      '{name} ({address}) ist verantwortlich für die personenbezogenen Daten, die Sie bei der Buchung angeben. Das Buchungssystem wird von {provider} bereitgestellt. Dieser Dienstleister verarbeitet die Daten im Auftrag von {name} auf Servern in Singapur.',
    techProvider: 'einem Technologieanbieter',
    collectTitle: 'Welche Daten wir erheben und warum',
    collect:
      'Ihren Namen, Ihre E-Mail-Adresse, Telefonnummer, Ihr Land, Ihre bevorzugte Sprache, Ihre Aufenthaltsdaten und etwaige besondere Wünsche – um Ihre Buchung entgegenzunehmen und zu verwalten, Ihnen Bestätigungen und Anreiseinformationen zu senden und die Registrierungsvorschriften für den Tourismus in Sri Lanka einzuhalten. Kartendaten geben Sie auf der Seite des Zahlungsanbieters (PayHere oder PayPal) ein; sie erreichen uns nie.',
    keepTitle: 'Wie lange wir Daten speichern',
    keep: 'Nachrichten werden 24 Monate gespeichert. Ihre Identität wird 36 Monate nach Ihrem letzten Aufenthalt anonymisiert. Finanzunterlagen werden wie gesetzlich vorgeschrieben 7 Jahre aufbewahrt.',
    rightsTitle: 'Ihre Rechte',
    rights:
      'Nach der EU-Datenschutz-Grundverordnung (DSGVO) und dem sri-lankischen Personal Data Protection Act können Sie eine Kopie Ihrer Daten anfordern, Ihre Daten berichtigen oder löschen lassen (ausgenommen Unterlagen, die wir gesetzlich aufbewahren müssen). Wenden Sie sich dazu an {contact}{whatsapp}.',
    theProperty: 'die Unterkunft',
    orWhatsapp: ' oder per WhatsApp an {number}',
    cookiesTitle: 'Cookies',
    cookies:
      'Diese Website verwendet nur zwei kleine Cookies: eines merkt sich die gewählte Sprache, das andere die Währung (eine automatisch erkannte Währung wird beim Schließen des Browsers vergessen). Es gibt keine Analyse-, Werbe- oder Tracking-Cookies, daher ist keine Einwilligung nötig.',
  },
  notFound: {
    title: 'Diese Seite haben wir leider nicht gefunden',
    body: 'Die Unterkunft oder Seite ist möglicherweise umgezogen.',
    home: 'Zur Startseite',
  },
};
