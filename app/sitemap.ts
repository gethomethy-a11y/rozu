import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.ROZU_SITE_URL ?? 'https://rozu-homethy.vercel.app';
  return [{ url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 }];
}
