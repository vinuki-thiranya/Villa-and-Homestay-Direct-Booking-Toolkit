import type { Dict } from '../t';
import type { pages as en } from '../en/pages';

export const pages: Dict<typeof en> = {
  experiences: {
    metaTitle: 'À faire à {place} — transferts, surf, safaris | {name}',
    metaDescription: 'Transferts aéroport, surf, baleines et safaris à {place} avec {name}, auprès de guides et chauffeurs locaux de confiance.',
    title: 'Expériences et transferts',
    nearby: 'À faire autour de {name}',
    bookable: 'À réserver avec votre séjour',
    intro: 'Organisés par {host} avec des chauffeurs et des guides que nous connaissons personnellement. Réservez d’abord votre séjour, puis ajoutez-les depuis votre page de réservation, ou demandez-nous simplement sur WhatsApp.',
    empty: 'Demandez-nous sur WhatsApp pour les transferts et les excursions à la journée.',
    bookYourStay: 'Réservez votre séjour',
    categories: {
      airport_pickup: 'Transfert aéroport',
      driver: 'Chauffeur',
      tuk_tuk: 'Tuk-tuk',
      surf_lesson: 'Surf',
      whale_watching: 'Baleines',
      safari: 'Safari',
      cooking_class: 'Cours de cuisine',
      laundry: 'Laverie',
      bicycle: 'Vélo',
      other: 'Expérience',
    },
  },
  location: {
    metaTitle: 'Comment venir à {name}, {place}',
    metaDescription: 'Adresse, carte et itinéraire pour {name} à {place}. Arrivée à partir de {in}, départ jusqu’à {out}.',
    title: 'Accès et itinéraire',
    gettingHere: 'Comment venir',
    mapTitle: 'Carte de {name}',
    mapSoon: 'Carte bientôt disponible.',
    directions: 'Itinéraire dans Google Maps',
    arrival: 'Arrivée',
    arrivalTimes: 'Arrivée à partir de {in}, départ jusqu’à {out}.',
    arrivalHelp: 'Indiquez votre heure d’arrivée à l’hôte sur WhatsApp : nous pouvons organiser un transfert depuis l’aéroport ou la gare.',
    houseRules: 'Règles de la maison',
  },
  contact: {
    metaTitle: 'Contacter {name}',
    metaDescription: 'Écrivez à {name} sur WhatsApp ou par e-mail pour les chambres, les transferts et les disponibilités.',
    title: 'Contacter {name}',
    fastest: 'Pour joindre {host} au plus vite, passez par WhatsApp.',
    us: 'notre équipe',
    whatsapp: 'WhatsApp',
    email: 'E-mail',
  },
  privacy: {
    metaTitle: 'Confidentialité — {name}',
    title: 'Politique de confidentialité',
    controller:
      '{name} ({address}) est le responsable du traitement des données personnelles que vous fournissez lors de votre réservation. Le système de réservation est fourni par {provider}, qui traite ces données pour le compte de {name}, sur des serveurs situés à Singapour.',
    techProvider: 'un prestataire technique',
    collectTitle: 'Données collectées et finalités',
    collect:
      'Vos nom, adresse e-mail, numéro de téléphone, pays, langue préférée, dates de séjour et éventuelles demandes particulières — afin d’enregistrer et de gérer votre réservation, de vous envoyer les confirmations et les informations d’arrivée, et de respecter les règles sri-lankaises d’enregistrement touristique. Les données de carte bancaire sont saisies sur la page du prestataire de paiement (PayHere ou PayPal) et ne nous parviennent jamais.',
    keepTitle: 'Durée de conservation',
    keep: 'Les messages sont conservés 24 mois. Votre identité est anonymisée 36 mois après votre dernier séjour. Les documents comptables sont conservés 7 ans, comme l’exige la loi.',
    rightsTitle: 'Vos droits',
    rights:
      'En vertu du RGPD de l’Union européenne et de la loi sri-lankaise sur la protection des données personnelles (Personal Data Protection Act), vous pouvez demander une copie de vos données, leur rectification ou leur suppression (sauf pour les documents que la loi nous impose de conserver). Contact : {contact}{whatsapp}.',
    theProperty: 'l’établissement',
    orWhatsapp: ' ou WhatsApp {number}',
    cookiesTitle: 'Cookies',
    cookies:
      'Ce site n’utilise que deux petits cookies : l’un mémorise la langue choisie, l’autre la devise (une devise devinée pour vous est oubliée à la fermeture du navigateur). Aucun cookie de mesure d’audience, de publicité ou de suivi : aucun consentement n’est donc nécessaire.',
  },
  notFound: {
    title: 'Page introuvable',
    body: 'L’établissement ou la page a peut-être été déplacé.',
    home: 'Retour à l’accueil',
  },
};
