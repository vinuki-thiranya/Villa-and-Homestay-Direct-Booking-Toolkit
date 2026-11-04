import type { Dict } from '../t';
import type { search as en } from '../en/search';

export const search: Dict<typeof en> = {
  checkIn: 'පැමිණෙන දිනය',
  checkOut: 'පිටවන දිනය',
  addDate: 'තෝරන්න',
  guests: 'අමුත්තන්',
  guestOption_one: 'අමුත්තන් {n}',
  guestOption_other: 'අමුත්තන් {n}',
  seePrices: 'මිල බලන්න',
  calTitle: 'ඔබගේ දින',
  calLoading: 'හිස් දින පූරණය වෙමින්…',
  calChooseCheckIn: 'පැමිණෙන දිනය තෝරන්න',
  calChooseCheckOut: 'පැමිණීම {date}. දැන් පිටවන දිනය තෝරන්න.',
  calRange: '{from} සිට {to} දක්වා, {nights}',
  calClose: 'වසන්න',
  calClear: 'මකන්න',
  calUse_one: 'රාත්‍රී {n} තෝරන්න',
  calUse_other: 'රාත්‍රී {n} තෝරන්න',
  calChooseDates: 'දින තෝරන්න',
  dayCheckIn: ', පැමිණීම',
  dayCheckOut: ', පිටවීම',
  dayBooked: ', වෙන් කර ඇත',
  weekdays: 'ස අ බ බ්‍ර සි සෙ ඉ',
};
