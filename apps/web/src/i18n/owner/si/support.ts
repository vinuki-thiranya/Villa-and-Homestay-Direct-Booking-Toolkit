import type { Dict } from '../t';
import type { support as en } from '../en/support';

export const support: Dict<typeof en> = {
  title: 'සහාය',
  ticketMeta: 'සහාය ඉල්ලීම',
  conversations: 'අප සමඟ ඔබගේ සංවාද',
  empty: 'තවම ඉල්ලීම් නැත. පහතින් ඕනෑම දෙයක් අසන්න; අපි පෙ.ව. 7 සිට ප.ව. 10 දක්වා පිළිතුරු දෙමු.',
  urgent: 'හදිසි',
  ask: 'උදව් ඉල්ලන්න',
  send: 'StayDirect වෙත යවන්න',
  subject: 'මාතෘකාව',
  subjectPlaceholder: 'PayHere ගෙවීම් පෙන්වන්නේ නැත',
  priority: 'කෙතරම් හදිසිද?',
  priorityNormal: 'සාමාන්‍ය',
  priorityUrgent: 'හදිසි: දැන් අමුත්තන්ට බලපායි',
  priorityLow: 'ඔබට හැකි විට',
  body: 'සිදු වූයේ කුමක්ද?',
  back: '← සහාය',
  staff: 'StayDirect',
  you: 'ඔබ',
  reopen: 'පිළිතුරක් සමඟ නැවත විවෘත කරන්න',
  reply: 'පිළිතුර යවන්න',
  yourReply: 'ඔබගේ පිළිතුර',
  sent: 'යැව්වා',
  status: {
    open: 'StayDirect බලාපොරොත්තුවෙන්',
    pending: 'පිළිතුරු දී ඇත: දැන් ඔබගේ වාරය',
    closed: 'වසා ඇත',
  },
};
