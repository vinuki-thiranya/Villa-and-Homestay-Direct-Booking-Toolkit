import type { Dict } from '../t';
import type { pay as en } from '../en/pay';

export const pay: Dict<typeof en> = {
  heading: 'आप कैसे भुगतान करना चाहेंगे?',
  dueNow: 'अभी देना है: {amount}',
  chargedIn: '({approx})। आपसे {currency} में चार्ज किया जाएगा; अंतिम रेट आपका बैंक या कार्ड तय करता है।',
  notSetUp: 'ऑनलाइन भुगतान अभी सेट अप नहीं है। डिपॉज़िट के लिए होस्ट आपसे WhatsApp पर संपर्क करेंगे।',
  somewhereElse: 'कहीं और से भुगतान कर रहे हैं?',
  preparing: 'सुरक्षित भुगतान तैयार हो रहा है…',
  startFailed: 'भुगतान शुरू नहीं हो सका',
  direct: 'आप सीधे {property} को भुगतान करते हैं। कार्ड की जानकारी पेमेंट प्रोवाइडर के पेज पर डाली जाती है और इस साइट तक कभी नहीं पहुँचती।',
  groups: {
    abroad: 'विदेश से भुगतान',
    india: 'भारत से भुगतान',
    sri_lanka: 'श्रीलंका में भुगतान',
  },
  options: {
    abroad: {
      payhere: { title: 'कार्ड', detail: 'सुरक्षित PayHere पेज पर Visa या Mastercard' },
      paypal: { title: 'PayPal', detail: 'आपका PayPal बैलेंस या कोई भी कार्ड, USD, EUR या GBP में' },
      bank: { title: 'बैंक ट्रांसफ़र या Wise', detail: 'ट्रांसफ़र करें, फिर स्लिप अपलोड करें; होस्ट कन्फ़र्म करेंगे' },
    },
    india: {
      lankaqr: { title: 'UPI', detail: 'GPay, PhonePe या Paytm से LankaQR कोड स्कैन करें' },
      payhere: { title: 'कार्ड', detail: 'सुरक्षित PayHere पेज पर Visa या Mastercard' },
    },
    sri_lanka: {
      payhere: { title: 'कार्ड, Genie या FriMi', detail: 'PayHere पर श्रीलंकाई कार्ड और वॉलेट' },
      lankaqr: { title: 'LankaQR', detail: 'किसी भी श्रीलंकाई बैंकिंग ऐप से स्कैन करें' },
      bank: { title: 'बैंक ट्रांसफ़र', detail: 'ट्रांसफ़र करें, फिर स्लिप अपलोड करें; होस्ट कन्फ़र्म करेंगे' },
    },
  },
  qr: {
    alt: '{merchant} के लिए LankaQR कोड',
    scan: 'किसी भी UPI या श्रीलंकाई बैंकिंग ऐप से स्कैन करें और {merchant} को ठीक {amount} का भुगतान करें।',
    note: 'पेमेंट नोट में {reference} लिखें।',
    held: 'आपकी तारीखें {time} तक रोकी गई हैं। नीचे पेमेंट का स्क्रीनशॉट अपलोड करें ताकि होस्ट कन्फ़र्म कर सकें।',
  },
  bank: {
    accountName: 'खाते का नाम',
    bank: 'बैंक',
    accountNumber: 'खाता नंबर',
    branch: 'ब्रांच',
    amount: 'राशि',
    reference: 'रेफ़रेंस',
    held: 'आपकी तारीखें {time} तक रोकी गई हैं।',
  },
  paypal: {
    amount: 'राशि: {amount}',
    loadFailed: 'PayPal लोड नहीं हो सका',
    captureFailed: 'PayPal भुगतान पूरा नहीं हो सका',
    error: 'PayPal ने एक गड़बड़ी बताई। कृपया फिर से कोशिश करें या कोई दूसरा तरीका चुनें।',
  },
  slip: {
    label: 'पेमेंट स्लिप या स्क्रीनशॉट (JPG, PNG, PDF, 5 MB तक)',
    upload: 'स्लिप अपलोड करें',
    uploading: 'अपलोड हो रहा है…',
    failed: 'अपलोड नहीं हो सका',
    received: 'धन्यवाद, स्लिप मिल गई। होस्ट जल्द ही आपकी बुकिंग कन्फ़र्म करेंगे और आपको ईमेल मिलेगा।',
  },
};
