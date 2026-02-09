import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://solsignal-dashboard.vercel.app';

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/agents`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/stats`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/portfolio`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/publish`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];
}
