import type { Dict } from '../t';
import type { conflicts as en } from '../en/conflicts';

export const conflicts: Dict<typeof en> = {
  title: 'ද්විත්ව වෙන්කිරීම්',
  intro:
    'දැනටමත් වෙන් වී ඇති රාත්‍රියක් OTA එකක් විකුණා ඇත. සෘජු වෙන්කිරීම අවලංගු කර අමුත්තාට මුදල ආපසු ගෙවන්න, නැතහොත් ඔවුන්ගේ අමුත්තා වෙනත් තැනකට මාරු කරන ලෙස OTA එකෙන් ඉල්ලන්න. OTA එක එම රාත්‍රිය ඉවත් කළ විට ගැටලුව ස්වයංක්‍රීයව වැසේ.',
  open: 'විවෘත ({n})',
  none: 'ද්විත්ව වෙන්කිරීම් නැත.',
  booking: '{room} · {date} · {channel} වෙන්කිරීම',
  takenBy: 'දැනටමත් වෙන් කර ඇත්තේ',
  directBooking: 'සෘජු වෙන්කිරීම {ref}',
  blockOrOther: 'අවහිර කිරීමක් හෝ වෙනත් නාලිකාවක් මඟින්',
  resolve: 'විසඳූ ලෙස සලකුණු කරන්න',
  resolution: 'විසඳුම',
  relocate: 'අමුත්තා මාරු කරන ලෙස OTA එකෙන් ඉල්ලුවා',
  cancelRefund: 'සෘජු වෙන්කිරීම අවලංගු කර මුදල ආපසු ගෙව්වා',
  dismissed: 'සැබෑ ගැටලුවක් නොවේ',
  note: 'සටහන',
};
