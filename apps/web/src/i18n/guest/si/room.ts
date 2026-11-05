import type { Dict } from '../t';
import type { room as en } from '../en/room';

export const room: Dict<typeof en> = {
  metaTitle: '{name}, {place} හි {room} — සෘජුවම වෙන් කරන්න',
  metaDescription: '{room}: අමුත්තන් {n} දෙනෙකුට{beds}. {description}',
  breadcrumb: '{name} හි {rooms}',
  minNights: 'අවම රාත්‍රී {n}',
  inTheRoom: 'කාමරයේ ඇති දේ',
  priceNote: 'වට්ටම්වලට පෙර, රාත්‍රියකට',
  checkDates: 'දින බලන්න',
  paused: 'මාර්ගගත වෙන් කිරීම තාවකාලිකව නවතා ඇත. වෙන් කිරීමට {name} වෙත WhatsApp කරන්න.',
  perNight: 'රාත්‍රියකට',
};
