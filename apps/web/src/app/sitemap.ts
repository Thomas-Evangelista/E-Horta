import type { MetadataRoute } from 'next';
import { fetchAllCategories, fetchProductsForSitemap, siteUrl } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [categories, products] = await Promise.all([
    fetchAllCategories(),
    fetchProductsForSitemap(),
  ]);

  return [
    {
      url: base,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${base}/categorias`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...categories.map((category) => ({
      url: `${base}/categorias/${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/produtos/${product.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
