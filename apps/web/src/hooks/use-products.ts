'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import {
  mapProduct,
  mapProductDetail,
  type CategoryDTO,
  type Product,
  type ProductDetailDTO,
  type ProductSummaryDTO,
} from '@/types/api';

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  featured?: boolean;
  available?: boolean;
  sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';
  page?: number;
  limit?: number;
}

interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

function mapPage(dto: ProductSummaryDTO[]): Product[] {
  return dto.map(mapProduct);
}

async function fetchProducts(filters: ProductFilters): Promise<Paginated<Product>> {
  const envelope = await apiRequest<ProductSummaryDTO[]>('/products', {
    query: {
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      search: filters.search,
      featured: filters.featured === undefined ? undefined : String(filters.featured),
      available: filters.available === undefined ? undefined : String(filters.available),
      sort: filters.sort,
      page: filters.page,
      limit: filters.limit,
    },
  });
  return {
    items: mapPage(envelope.data),
    page: envelope.meta.page ?? 1,
    totalPages: envelope.meta.totalPages ?? 1,
    total: envelope.meta.total ?? 0,
  };
}

async function fetchList(path: string, limit?: number): Promise<Product[]> {
  const envelope = await apiRequest<ProductSummaryDTO[]>(path, { query: { limit } });
  return mapPage(envelope.data);
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products(filters as Record<string, unknown>),
    queryFn: () => fetchProducts(filters),
  });
}

export function useProductSearch(q: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.productSearch(q, page),
    queryFn: async (): Promise<Paginated<Product>> => {
      const envelope = await apiRequest<ProductSummaryDTO[]>('/products/search', {
        query: { q, page },
      });
      return {
        items: mapPage(envelope.data),
        page: envelope.meta.page ?? 1,
        totalPages: envelope.meta.totalPages ?? 1,
        total: envelope.meta.total ?? 0,
      };
    },
    enabled: q.trim().length > 0,
  });
}

export function useFeaturedProducts(limit = 10) {
  return useQuery({
    queryKey: queryKeys.productFeatured(),
    queryFn: () => fetchList('/products/featured', limit),
  });
}

export function useBestSellers(limit = 10) {
  return useQuery({
    queryKey: queryKeys.productBestSellers(),
    queryFn: () => fetchList('/products/best-sellers', limit),
  });
}

export function usePromotions(limit = 10) {
  return useQuery({
    queryKey: queryKeys.productPromotions(),
    queryFn: () => fetchList('/products/promotions', limit),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.productDetail(slug),
    queryFn: async () => {
      const envelope = await apiRequest<ProductDetailDTO>(`/products/${slug}`);
      return mapProductDetail(envelope.data);
    },
  });
}

export function useRecommendations(productId: string | undefined, limit = 6) {
  return useQuery({
    queryKey: queryKeys.recommendations(productId ?? ''),
    queryFn: () => fetchList(`/products/${productId}/recommendations`, limit),
    enabled: Boolean(productId),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async (): Promise<CategoryDTO[]> => {
      const envelope = await apiRequest<CategoryDTO[]>('/categories');
      return envelope.data;
    },
  });
}
