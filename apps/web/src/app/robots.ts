import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/conta', '/pedidos', '/checkout', '/notificacoes', '/busca'],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
