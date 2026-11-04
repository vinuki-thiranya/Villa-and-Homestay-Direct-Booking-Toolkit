// Guest site text: cancellation policies and why a room cannot be booked.
export const policy = {
  title: 'Cancellation policy',
  flexible: 'Full refund if you cancel at least 7 days before arrival. No refund after that.',
  moderate: '50% refund if you cancel at least 14 days before arrival. No refund after that.',
  strict: 'The deposit is non-refundable. Any amount paid above the deposit is refunded.',
  violations: {
    min_nights: 'Minimum stay is {n} nights for these dates',
    max_nights: 'Stay is longer than this room allows',
    max_guests: 'Too many guests for this room',
    closed_to_arrival: 'Arrivals are not possible on this date',
    closed_to_departure: 'Departures are not possible on this date',
    in_the_past: 'Check-in date is in the past',
    invalid_dates: 'Check-out must be after check-in',
    unavailable: 'Booked for these dates',
    other: 'Not available',
  },
};
