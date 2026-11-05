import type { Dict } from '../t';
import type { addons as en } from '../en/addons';

export const addons: Dict<typeof en> = {
  title: 'ඔබගේ නවාතැන වඩාත් රසවත් කරගන්න',
  qtyDate: '{name} × {qty}, {date}',
  status: {
    requested: 'ඉල්ලා ඇත',
    confirmed: 'තහවුරුයි',
    done: 'අවසන්',
    cancelled: 'අවලංගුයි',
  },
  youRated: 'ඔබ 5 න් {n} ක් ලබා දුන්නා',
  thisExperience: 'මෙම අත්දැකීම',
  rate: {
    open: 'ශ්‍රේණිගත කරන්න',
    how: '{name} කෙසේද?',
    rating: 'ශ්‍රේණිගත කිරීම',
    star_one: 'තරු {n}',
    star_other: 'තරු {n}',
    choose: 'තරු 1 සිට 5 දක්වා තෝරන්න',
    comment: 'අදහස',
    commentHint: 'සත්කාරකයා දැනගත යුතු යමක් තිබේද? (අත්‍යවශ්‍ය නැත)',
    send: 'ශ්‍රේණිගත කිරීම යවන්න',
    sending: 'යවමින්…',
    failed: 'ඔබගේ ශ්‍රේණිගත කිරීම සුරැකීමට නොහැකි විය',
  },
  requested: '{name} ඉල්ලා ඇත. සේවා සපයන්නා තහවුරු කරනු ඇති අතර මුදල ඔබගේ ඉතිරි මුදලට එකතු වේ.',
  orderFailed: 'ඇණවුම කළ නොහැකි විය',
  form: {
    date: 'දිනය',
    time: 'වේලාව',
    optional: '(අත්‍යවශ්‍ය නැත)',
    qty: 'ප්‍රමාණය',
    notes: 'සටහන්',
    notesHint: 'ගුවන් ගමන් අංකය, රැගෙන යන ස්ථානය…',
    leadTime: 'කරුණාකර අවම වශයෙන් පැය {hours} කට පෙර ඇණවුම් කරන්න.',
    request: 'ඉල්ලන්න',
    ordering: 'ඇණවුම් කරමින්…',
    cancel: 'අවලංගු කරන්න',
    add: 'මගේ නවාතැනට එක් කරන්න',
  },
};
