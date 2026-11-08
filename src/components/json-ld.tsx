import { ldJson } from '@/lib/seo';

/** Structured data for search engines. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}
