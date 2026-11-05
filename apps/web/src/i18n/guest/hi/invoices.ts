import type { Dict } from '../t';
import type { invoices as en } from '../en/invoices';

export const invoices: Dict<typeof en> = {
  title: 'इनवॉइस',
  visaTitle: 'वीज़ा रिन्यूअल के लिए इनवॉइस',
  visaHint: 'ये इनवॉइस आपके ठहरने और पते की पुष्टि करते हैं, जैसा कि डिजिटल नोमैड वीज़ा रिन्यू करते समय श्रीलंका इमिग्रेशन माँगता है।',
  download: 'इनवॉइस {number} PDF के रूप में डाउनलोड करें',
};
