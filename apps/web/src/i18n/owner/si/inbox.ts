import type { Dict } from '../t';
import type { inbox as en } from '../en/inbox';

export const inbox: Dict<typeof en> = {
  title: 'පණිවිඩ',
  conciergeLink: 'සහායක හා ක්ෂණික පිළිතුරු',
  filterLabel: 'සංවාද පෙරහන',
  filters: { all: 'සියල්ල', needs_human: 'ඔබව අවශ්‍යයි', open: 'විවෘත', closed: 'විසඳූ' },
  empty: 'තවම WhatsApp සංවාද නැත. ඔබගේ WhatsApp අංකයට පණිවිඩ එවන අමුත්තන් මෙහි පෙන්වයි; සැකසුම් → සහායක යටතේ අංකය සම්බන්ධ කරන්න.',
  needsYou: 'ඔබව අවශ්‍යයි',
  resolved: 'විසඳූ',
  unread: 'නොකියවූ',
  aiPaused: 'AI නවතා ඇත',
  aiOn: 'AI ක්‍රියාත්මකයි',
  canReply: 'පිළිතුරු දිය හැක',
  windowClosed: 'පැය 24 කාලය අවසන්',
  thread: {
    title: 'සංවාදය',
    back: '← පණිවිඩ',
    openWhatsapp: 'WhatsApp හි විවෘත කරන්න',
    resumeAi: 'AI නැවත ආරම්භ කරන්න',
    pauseAi: 'AI නවත්වන්න',
    reopen: 'නැවත විවෘත කරන්න',
    markResolved: 'විසඳූ ලෙස සලකුණු කරන්න',
    handedOver: 'සහායක මෙය ඔබට භාර දුන්නා: {summary}',
    messages: 'පණිවිඩ',
    ai: 'AI ·',
    automated: 'ස්වයංක්‍රීය ·',
    failed: 'අසාර්ථකයි: {error}',
    status: { queued: 'පෝලිමේ', sent: 'යැව්වා', delivered: 'ලැබුණා', read: 'කියෙව්වා', failed: 'අසාර්ථකයි' },
  },
};
