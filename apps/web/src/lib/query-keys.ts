export const queryKeys = {
  categories: ['categories'] as const,
  products: (filters?: Record<string, unknown>) => ['products', filters ?? {}] as const,
  productSearch: (q: string, page?: number) => ['products', 'search', q, page ?? 1] as const,
  productFeatured: () => ['products', 'featured'] as const,
  productBestSellers: () => ['products', 'best-sellers'] as const,
  productPromotions: () => ['products', 'promotions'] as const,
  productDetail: (slug: string) => ['products', 'detail', slug] as const,
  recommendations: (productId: string) => ['products', productId, 'recommendations'] as const,
};
