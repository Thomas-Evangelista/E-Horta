// Fetches server-side (metadata, SSR, sitemap) can target an internal API URL
// different from the public one (e.g., http://api:8080 inside Docker).
const API_BASE_URL =
  process.env.API_SERVER_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  error: { code: string; message: string } | null;
}

async function fetchApi<T>(path: string, revalidate?: number): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      next: revalidate ? { revalidate } : undefined,
    });
    if (!response.ok) return null;
    const envelope = (await response.json()) as ApiEnvelope<T>;
    return envelope.error ? null : envelope.data;
  } catch {
    return null;
  }
}

export interface SeoProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  sku: string;
  price: string;
  imageUrl: string | null;
  inventory?: { quantity: number; reservedQuantity: number } | null;
}

export interface SeoCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ReviewSummary {
  average: number | null;
  total: number;
}

export function toSeoNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchProductBySlug(slug: string): Promise<SeoProduct | null> {
  const product = await fetchApi<SeoProduct>(`/products/${encodeURIComponent(slug)}`, 60);
  if (!product || !product.id || !product.name) return null;
  return product;
}

export async function fetchReviewSummary(productId: string): Promise<ReviewSummary | null> {
  return fetchApi<ReviewSummary>(`/products/${productId}/reviews/summary`, 60);
}

export async function fetchCategoryBySlug(slug: string): Promise<SeoCategory | null> {
  const category = await fetchApi<SeoCategory>(`/categories/${encodeURIComponent(slug)}`, 300);
  if (!category || !category.id || !category.name) return null;
  return category;
}

export async function fetchAllCategories(): Promise<SeoCategory[]> {
  const categories = await fetchApi<SeoCategory[]>('/categories', 300);
  return Array.isArray(categories) ? categories : [];
}

export interface ProductListItem extends SeoProduct {
  isFeatured: boolean;
  unit: string;
  compareAtPrice: string | null;
}

export async function fetchProductsForSitemap(): Promise<SeoProduct[]> {
  const result = await fetchApi<ProductListItem[]>('/products?limit=100&sort=name-asc', 300);
  return Array.isArray(result) ? result : [];
}

export function buildProductJsonLd(
  product: SeoProduct,
  summary: ReviewSummary | null,
): Record<string, unknown> {
  const url = `${siteUrl()}/produtos/${product.slug}`;
  const availableStock = product.inventory
    ? product.inventory.quantity - product.inventory.reservedQuantity
    : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.imageUrl ?? undefined,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'BRL',
      price: toSeoNumber(product.price).toFixed(2),
      availability:
        availableStock === null || availableStock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    ...(summary && summary.total > 0 && summary.average !== null && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Math.round(summary.average * 10) / 10,
        reviewCount: summary.total,
      },
    }),
  };
}
