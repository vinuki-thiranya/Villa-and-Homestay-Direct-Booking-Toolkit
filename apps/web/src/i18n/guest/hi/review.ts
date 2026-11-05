import type { Dict } from '../t';
import type { review as en } from '../en/review';

export const review: Dict<typeof en> = {
  metaTitle: 'अपने स्टे का रिव्यू दें',
  notFound: 'रिव्यू लिंक नहीं मिला',
  notFoundHint: 'कृपया अपने चेक-आउट मैसेज में दिया गया लिंक इस्तेमाल करें।',
  loading: 'लोड हो रहा है',
  thanks: 'धन्यवाद, {name}!',
  publicHint: 'आपका रिव्यू दूसरे यात्रियों को {property} ढूँढने में मदद करेगा।',
  google: 'Google पर भी हमें रिव्यू दें',
  privateHint: 'आपका फ़ीडबैक निजी तौर पर होस्ट को भेजा गया। वे हर मैसेज पढ़ते हैं और चीज़ें ठीक करने के लिए आपसे संपर्क कर सकते हैं।',
  opensOn: 'रिव्यू {date} को खुलेंगे',
  opensHint: 'आपका स्टे: {from} से {to} तक। अपने चेक-आउट वाले दिन इस लिंक पर वापस आएँ।',
  chooseStars: 'स्टार रेटिंग चुनें।',
  failed: 'आपका रिव्यू भेजा नहीं जा सका',
  title: '{property} में आपका स्टे कैसा रहा?',
  dates: '{from} से {to} तक',
  yourRating: 'आपकी रेटिंग',
  rating: 'रेटिंग',
  starLabel_one: '{n} स्टार, {label}',
  starLabel_other: '{n} स्टार, {label}',
  labels: {
    poor: 'खराब',
    fair: 'ठीक-ठाक',
    good: 'अच्छा',
    veryGood: 'बहुत अच्छा',
    excellent: 'शानदार',
  },
  more: 'और बताएँ',
  optional: '(वैकल्पिक)',
  send: 'रिव्यू भेजें',
  sending: 'भेजा जा रहा है…',
};
