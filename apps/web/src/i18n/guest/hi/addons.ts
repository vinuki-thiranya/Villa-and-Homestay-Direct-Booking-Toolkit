import type { Dict } from '../t';
import type { addons as en } from '../en/addons';

export const addons: Dict<typeof en> = {
  title: 'अपने स्टे का पूरा मज़ा लें',
  qtyDate: '{name} × {qty}, {date}',
  status: {
    requested: 'अनुरोध भेजा',
    confirmed: 'कन्फ़र्म',
    done: 'पूरा हुआ',
    cancelled: 'कैंसिल',
  },
  youRated: 'आपने 5 में से {n} रेटिंग दी',
  thisExperience: 'यह अनुभव',
  rate: {
    open: 'रेटिंग दें',
    how: '{name} कैसा रहा?',
    rating: 'रेटिंग',
    star_one: '{n} स्टार',
    star_other: '{n} स्टार',
    choose: '1 से 5 स्टार चुनें',
    comment: 'कमेंट',
    commentHint: 'होस्ट को कुछ बताना चाहते हैं? (वैकल्पिक)',
    send: 'रेटिंग भेजें',
    sending: 'भेजा जा रहा है…',
    failed: 'आपकी रेटिंग सेव नहीं हो सकी',
  },
  requested: '{name} का अनुरोध भेज दिया गया। प्रोवाइडर कन्फ़र्म करेंगे, और राशि आपकी बकाया राशि में जोड़ दी जाएगी।',
  orderFailed: 'ऑर्डर नहीं हो सका',
  form: {
    date: 'तारीख',
    time: 'समय',
    optional: '(वैकल्पिक)',
    qty: 'संख्या',
    notes: 'नोट्स',
    notesHint: 'फ़्लाइट नंबर, पिकअप पॉइंट…',
    leadTime: 'कृपया कम से कम {hours} घंटे पहले ऑर्डर करें।',
    request: 'अनुरोध करें',
    ordering: 'ऑर्डर हो रहा है…',
    cancel: 'कैंसिल करें',
    add: 'मेरे स्टे में जोड़ें',
  },
};
