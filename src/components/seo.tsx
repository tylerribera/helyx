import Head from 'expo-router/head';
import { env } from '@/lib/env';

/**
 * Per-page metadata.
 *
 * `expo-router/head` renders into the document head on web and is a no-op on
 * native, so screens can declare this unconditionally.
 *
 * Every indexable page needs its own title and description. Without them each
 * route inherits the same generic title, and search engines treat near-identical
 * titles as duplicate content — which matters here, because the catalog is the
 * reason the website exists.
 */
export function PageMeta({
  title,
  description,
  path,
  noindex,
}: {
  /** Page-specific part. " | Helyx" is appended unless `title` is empty. */
  title: string;
  description: string;
  /** Path for the canonical URL, e.g. "/catalog". */
  path: string;
  /**
   * Keep the page out of search results. Use for app flows that are reachable
   * by URL but are not content — onboarding, account screens. Indexing a
   * half-finished flow wastes crawl budget and gives searchers a dead end.
   */
  noindex?: boolean;
}) {
  const fullTitle = title ? `${title} | Helyx` : 'Helyx';
  const canonical = `${env.siteUrl}${path}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description.slice(0, 155)} />
      {noindex ? <meta name="robots" content="noindex,follow" /> : null}
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description.slice(0, 155)} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
    </Head>
  );
}
