import type { Dict } from '../t';
import type { addons as en } from '../en/addons';

export const addons: Dict<typeof en> = {
  title: 'Profitez pleinement de votre séjour',
  qtyDate: '{name} × {qty}, {date}',
  status: {
    requested: 'Demandé',
    confirmed: 'Confirmé',
    done: 'Terminé',
    cancelled: 'Annulé',
  },
  youRated: 'Votre note : {n}/5',
  thisExperience: 'cette expérience',
  rate: {
    open: 'Noter',
    how: 'Qu’avez-vous pensé de {name} ?',
    rating: 'Note',
    star_one: '{n} étoile',
    star_other: '{n} étoiles',
    choose: 'Choisissez de 1 à 5 étoiles',
    comment: 'Commentaire',
    commentHint: 'Quelque chose à signaler à l’hôte ? (facultatif)',
    send: 'Envoyer la note',
    sending: 'Envoi…',
    failed: 'Impossible d’enregistrer votre note',
  },
  requested: '{name} : demande envoyée. Le prestataire confirmera, et le montant sera ajouté à votre solde.',
  orderFailed: 'Impossible de passer la commande',
  form: {
    date: 'Date',
    time: 'Heure',
    optional: '(facultatif)',
    qty: 'Qté',
    notes: 'Remarques',
    notesHint: 'N° de vol, lieu de prise en charge…',
    leadTime: 'Merci de commander au moins {hours} heures à l’avance.',
    request: 'Demander',
    ordering: 'Envoi…',
    cancel: 'Annuler',
    add: 'Ajouter à mon séjour',
  },
};
