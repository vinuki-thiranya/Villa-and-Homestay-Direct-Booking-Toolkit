import { notFound } from 'next/navigation';

/** Any other path on staydirect.lk gets the marketing site's own not-found page. */
export default function UnknownPath() {
  notFound();
}
