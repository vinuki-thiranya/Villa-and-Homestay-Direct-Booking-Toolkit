import type { Dict } from '../t';
import type { review as en } from '../en/review';

export const review: Dict<typeof en> = {
  metaTitle: 'Votre avis sur votre séjour',
  notFound: 'Lien d’avis introuvable',
  notFoundHint: 'Veuillez utiliser le lien reçu dans votre message de départ.',
  loading: 'Chargement',
  thanks: 'Merci, {name} !',
  publicHint: 'Votre avis aidera d’autres voyageurs à découvrir {property}.',
  google: 'Laissez-nous aussi un avis sur Google',
  privateHint: 'Votre retour a été transmis en privé à l’hôte, qui lit chaque message et pourra vous contacter pour y remédier.',
  opensOn: 'Avis possibles à partir du {date}',
  opensHint: 'Votre séjour : du {from} au {to}. Revenez sur ce lien le jour de votre départ.',
  chooseStars: 'Choisissez une note en étoiles.',
  failed: 'Impossible d’envoyer votre avis',
  title: 'Comment s’est passé votre séjour à {property} ?',
  dates: 'Du {from} au {to}',
  yourRating: 'Votre note',
  rating: 'Note',
  starLabel_one: '{n} étoile, {label}',
  starLabel_other: '{n} étoiles, {label}',
  labels: {
    poor: 'Médiocre',
    fair: 'Passable',
    good: 'Bien',
    veryGood: 'Très bien',
    excellent: 'Excellent',
  },
  more: 'Dites-nous-en plus',
  optional: '(facultatif)',
  send: 'Envoyer l’avis',
  sending: 'Envoi…',
};
