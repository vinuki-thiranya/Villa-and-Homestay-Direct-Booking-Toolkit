import type { Dict } from '../t';
import type { rooms as en } from '../en/rooms';

export const rooms: Dict<typeof en> = {
  metaTitle: '{name}, {place} के कमरे — सीधी बुकिंग',
  metaDescription: '{name} में {n} कमरे — {place} में एक {type}। बेड, सुविधाओं और कीमतों की तुलना करें।',
  title: 'कमरे',
  intro: 'कीमतें प्रति रात हैं, लंबे स्टे और लास्ट-मिनट छूट से पहले।',
  sleeps: 'अधिकतम {n} लोग',
  aNight: 'प्रति रात',
  book: 'बुक करें',
  bookRoom: '{room} बुक करें',
  photosOf: '{name} की फ़ोटो',
  slide: '{n} में से {i}',
  prevPhoto: 'पिछली फ़ोटो',
  nextPhoto: 'अगली फ़ोटो',
  photoOf: '{n} में से फ़ोटो {i}',
  photoAlt: '{name}, फ़ोटो {i}',
};
