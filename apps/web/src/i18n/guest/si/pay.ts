import type { Dict } from '../t';
import type { pay as en } from '../en/pay';

export const pay: Dict<typeof en> = {
  heading: 'ඔබ ගෙවීමට කැමති කෙසේද?',
  dueNow: 'දැන් ගෙවිය යුතු: {amount}',
  chargedIn: '({approx}). ඔබෙන් අය කරන්නේ {currency} වලිනි; අවසාන අනුපාතය ඔබගේ බැංකුව හෝ කාඩ්පත තීරණය කරයි.',
  notSetUp: 'මාර්ගගත ගෙවීම් තවම සකසා නැත. අත්තිකාරම සූදානම් කිරීමට සත්කාරකයා ඔබව WhatsApp මගින් සම්බන්ධ කර ගනු ඇත.',
  somewhereElse: 'වෙනත් තැනක සිට ගෙවනවාද?',
  preparing: 'ආරක්ෂිත ගෙවීම සූදානම් කරමින්…',
  startFailed: 'ගෙවීම ආරම්භ කළ නොහැකි විය',
  direct: 'ඔබ {property} වෙත සෘජුවම ගෙවනවා. කාඩ්පත් විස්තර ඇතුළත් කරන්නේ ගෙවීම් සපයන්නාගේ පිටුවේ පමණයි; ඒවා කිසි විටෙක මෙම වෙබ් අඩවියට නොඑයි.',
  groups: {
    abroad: 'විදේශයක සිට ගෙවීම',
    india: 'ඉන්දියාවේ සිට ගෙවීම',
    sri_lanka: 'ශ්‍රී ලංකාවේ සිට ගෙවීම',
  },
  options: {
    abroad: {
      payhere: { title: 'කාඩ්පත', detail: 'ආරක්ෂිත PayHere පිටුවේ Visa හෝ Mastercard' },
      paypal: { title: 'PayPal', detail: 'ඔබගේ PayPal ශේෂය හෝ ඕනෑම කාඩ්පතක්, USD, EUR හෝ GBP වලින්' },
      bank: { title: 'බැංකු මාරුව හෝ Wise', detail: 'මුදල් මාරු කර රිසිට්පත උඩුගත කරන්න; සත්කාරකයා තහවුරු කරයි' },
    },
    india: {
      lankaqr: { title: 'UPI', detail: 'GPay, PhonePe හෝ Paytm මගින් LankaQR කේතය ස්කෑන් කරන්න' },
      payhere: { title: 'කාඩ්පත', detail: 'ආරක්ෂිත PayHere පිටුවේ Visa හෝ Mastercard' },
    },
    sri_lanka: {
      payhere: { title: 'කාඩ්පත, Genie හෝ FriMi', detail: 'PayHere හි ශ්‍රී ලංකා කාඩ්පත් සහ ඩිජිටල් පසුම්බි' },
      lankaqr: { title: 'LankaQR', detail: 'ඕනෑම ශ්‍රී ලංකා බැංකු යෙදුමකින් ස්කෑන් කරන්න' },
      bank: { title: 'බැංකු මාරුව', detail: 'මුදල් මාරු කර රිසිට්පත උඩුගත කරන්න; සත්කාරකයා තහවුරු කරයි' },
    },
  },
  qr: {
    alt: '{merchant} සඳහා LankaQR කේතය',
    scan: 'ඕනෑම UPI හෝ ශ්‍රී ලංකා බැංකු යෙදුමකින් ස්කෑන් කර {merchant} වෙත හරියටම {amount} ගෙවන්න.',
    note: 'ගෙවීමේ සටහනේ {reference} ඇතුළත් කරන්න.',
    held: 'ඔබගේ දින {time} දක්වා රඳවා තබනු ලැබේ. සත්කාරකයාට තහවුරු කිරීමට හැකි වන සේ ගෙවීමේ තිර රුව පහතින් උඩුගත කරන්න.',
  },
  bank: {
    accountName: 'ගිණුමේ නම',
    bank: 'බැංකුව',
    accountNumber: 'ගිණුම් අංකය',
    branch: 'ශාඛාව',
    amount: 'මුදල',
    reference: 'යොමු අංකය',
    held: 'ඔබගේ දින {time} දක්වා රඳවා තබනු ලැබේ.',
  },
  paypal: {
    amount: 'මුදල: {amount}',
    loadFailed: 'PayPal පූරණය කළ නොහැකි විය',
    captureFailed: 'PayPal ගෙවීම සම්පූර්ණ කළ නොහැකි විය',
    error: 'PayPal දෝෂයක් වාර්තා කළා. කරුණාකර නැවත උත්සාහ කරන්න, නැතහොත් වෙනත් ක්‍රමයක් තෝරන්න.',
  },
  slip: {
    label: 'ගෙවීමේ රිසිට්පත හෝ තිර රුව (JPG, PNG, PDF, 5 MB දක්වා)',
    upload: 'රිසිට්පත උඩුගත කරන්න',
    uploading: 'උඩුගත කරමින්…',
    failed: 'උඩුගත කිරීම අසාර්ථකයි',
    received: 'ස්තූතියි, රිසිට්පත ලැබුණා. සත්කාරකයා ඉක්මනින් ඔබගේ වෙන්කිරීම තහවුරු කරනු ඇති අතර ඔබට ඊමේල් එකක් ලැබේ.',
  },
};
