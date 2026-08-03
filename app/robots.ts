import type { MetadataRoute } from 'next';

/* The API routes and the legal pages are deliberately kept out of the index:
   the API has nothing to read, and an Impressum ranking above the product is
   not the search result anyone wants. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.ROZU_SITE_URL ?? 'https://rozu-homethy.vercel.app';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
