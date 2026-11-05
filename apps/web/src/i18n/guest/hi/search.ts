import type { Dict } from '../t';
import type { search as en } from '../en/search';

export const search: Dict<typeof en> = {
  checkIn: 'चेक-इन',
  checkOut: 'चेक-आउट',
  addDate: 'तारीख चुनें',
  guests: 'मेहमान',
  guestOption_one: '{n} मेहमान',
  guestOption_other: '{n} मेहमान',
  seePrices: 'कीमतें देखें',
  calTitle: 'आपकी तारीखें',
  calLoading: 'खाली तारीखें लोड हो रही हैं…',
  calChooseCheckIn: 'चेक-इन की तारीख चुनें',
  calChooseCheckOut: 'चेक-इन {date}। अब चेक-आउट चुनें।',
  calRange: '{from} से {to} तक, {nights}',
  calClose: 'बंद करें',
  calClear: 'क्लियर करें',
  calUse_one: '{n} रात चुनें',
  calUse_other: '{n} रातें चुनें',
  calChooseDates: 'तारीखें चुनें',
  dayCheckIn: ', चेक-इन',
  dayCheckOut: ', चेक-आउट',
  dayBooked: ', बुक है',
  weekdays: 'सो मं बु गु शु श र',
};
