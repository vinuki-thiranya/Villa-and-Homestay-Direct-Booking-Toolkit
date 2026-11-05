import type { Dict } from '../t';
import type { room as en } from '../en/room';

export const room: Dict<typeof en> = {
  metaTitle: '{name}, {place} में {room} — सीधी बुकिंग',
  metaDescription: '{room}: अधिकतम {n} लोग{beds}। {description}',
  breadcrumb: '{name} के {rooms}',
  minNights: 'कम से कम {n} रातें',
  inTheRoom: 'कमरे में',
  priceNote: 'प्रति रात, छूट से पहले',
  checkDates: 'तारीखें देखें',
  paused: 'ऑनलाइन बुकिंग अभी बंद है। बुक करने के लिए {name} को WhatsApp पर मैसेज करें।',
  perNight: 'प्रति रात',
};
