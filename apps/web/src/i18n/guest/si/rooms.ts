import type { Dict } from '../t';
import type { rooms as en } from '../en/rooms';

export const rooms: Dict<typeof en> = {
  metaTitle: '{name}, {place} හි කාමර — සෘජුවම වෙන් කරන්න',
  metaDescription: '{place} හි {type} වන {name} හි කාමර {n} ක්. ඇඳන්, පහසුකම් සහ මිල සසඳන්න.',
  title: 'කාමර',
  intro: 'මිල රාත්‍රියකට වන අතර, දිගු කාලීන හා අවසන් මොහොතේ වට්ටම්වලට පෙරය.',
  sleeps: 'අමුත්තන් {n} දෙනෙකුට',
  aNight: 'රාත්‍රියකට',
  book: 'වෙන් කරන්න',
  bookRoom: '{room} වෙන් කරන්න',
  photosOf: '{name} හි ඡායාරූප',
  slide: '{n} න් {i}',
  prevPhoto: 'පෙර ඡායාරූපය',
  nextPhoto: 'ඊළඟ ඡායාරූපය',
  photoOf: 'ඡායාරූපය {n} න් {i}',
  photoAlt: '{name}, ඡායාරූපය {i}',
};
