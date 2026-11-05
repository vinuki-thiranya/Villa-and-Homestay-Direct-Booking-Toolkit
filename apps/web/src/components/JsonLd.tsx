import { ldJson } from '@/lib/jsonld';

/** schema.org data for search engines; see lib/jsonld.ts. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}
