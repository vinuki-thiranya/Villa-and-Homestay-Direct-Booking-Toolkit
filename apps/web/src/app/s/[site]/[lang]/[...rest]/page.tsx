import { notFound } from 'next/navigation';

/** Any other path on a guest site gets the site's own (themed, translated) not-found page. */
export default function UnknownPath() {
  notFound();
}
