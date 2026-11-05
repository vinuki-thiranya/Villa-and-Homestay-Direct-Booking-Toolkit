import type { Dict } from '../t';
import type { policy as en } from '../en/policy';

export const policy: Dict<typeof en> = {
  title: 'Conditions d’annulation',
  flexible: 'Remboursement intégral en cas d’annulation au moins 7 jours avant l’arrivée. Aucun remboursement au-delà.',
  moderate: 'Remboursement de 50 % en cas d’annulation au moins 14 jours avant l’arrivée. Aucun remboursement au-delà.',
  strict: 'L’acompte n’est pas remboursable. Toute somme versée au-delà de l’acompte est remboursée.',
  violations: {
    min_nights: 'Séjour minimum de {n} nuits à ces dates',
    max_nights: 'Séjour plus long que ne le permet cette chambre',
    max_guests: 'Trop de personnes pour cette chambre',
    closed_to_arrival: 'Aucune arrivée possible à cette date',
    closed_to_departure: 'Aucun départ possible à cette date',
    in_the_past: 'La date d’arrivée est déjà passée',
    invalid_dates: 'Le départ doit être postérieur à l’arrivée',
    unavailable: 'Complet à ces dates',
    other: 'Indisponible',
  },
};
