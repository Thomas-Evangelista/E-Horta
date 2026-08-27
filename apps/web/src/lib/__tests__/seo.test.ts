import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildProductJsonLd,
  fetchAllCategories,
  fetchCategoryBySlug,
  fetchProductBySlug,
  fetchProductsForSitemap,
  fetchReviewSummary,
  siteUrl,
  toSeoNumber,
  type SeoProduct,
} from '../seo';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const product: SeoProduct = {
  id: 'p1',
  name: 'Tomate Orgânico',
  slug: 'tomate-organico',
  shortDescription: 'Fresco',
  description: 'Da horta',
  sku: 'TOM-001',
  price: '10.50',
  imageUrl: 'https://cdn/tomate.jpg',
  inventory: { quantity: 20, reservedQuantity: 5 },
};

describe('siteUrl', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('retorna default quando não configurado', () => {
    expect(siteUrl()).toBe('http://localhost:3000');
  });

  it('usa a variável configurada e remove barra final', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://ehorta.com.br/';
    expect(siteUrl()).toBe('https://ehorta.com.br');
  });
});

describe('toSeoNumber', () => {
  it('retorna 0 para valores nulos, undefined ou inválidos', () => {
    expect(toSeoNumber(null)).toBe(0);
    expect(toSeoNumber(undefined)).toBe(0);
    expect(toSeoNumber('abc')).toBe(0);
  });

  it('aceita número ou string numérica', () => {
    expect(toSeoNumber(42)).toBe(42);
    expect(toSeoNumber('19.99')).toBeCloseTo(19.99);
  });
});

describe('buildProductJsonLd', () => {
  it('constrói JSON-LD de Product com price e availability InStock', () => {
    const ld = buildProductJsonLd(product, null);
    expect(ld['@type']).toBe('Product');
    expect(ld.sku).toBe('TOM-001');
    expect((ld as { offers: { price: string } }).offers.price).toBe('10.50');
    expect((ld as { offers: { availability: string } }).offers.availability).toBe(
      'https://schema.org/InStock',
    );
    expect((ld as { offers: { url: string } }).offers.url).toBe(
      'http://localhost:3000/produtos/tomate-organico',
    );
  });

  it('marca OutOfStock quando não há estoque disponível', () => {
    const outOfStock = { ...product, inventory: { quantity: 2, reservedQuantity: 5 } };
    const ld = buildProductJsonLd(outOfStock, null);
    expect((ld as { offers: { availability: string } }).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('inclui aggregateRating apenas com summary válido', () => {
    const ld = buildProductJsonLd(product, { average: 4.5, total: 12 });
    const rating = (ld as { aggregateRating?: { ratingValue: number; reviewCount: number } }).aggregateRating;
    expect(rating).toBeDefined();
    expect(rating?.ratingValue).toBe(4.5);
    expect(rating?.reviewCount).toBe(12);
  });

  it('omite aggregateRating quando não há avaliações', () => {
    const ld = buildProductJsonLd(product, { average: null, total: 0 });
    expect((ld as { aggregateRating?: unknown }).aggregateRating).toBeUndefined();
  });
});

describe('fetch helpers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchProductBySlug retorna produto válido', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: product, meta: {}, error: null }));
    const result = await fetchProductBySlug('tomate-organico');
    expect(result).toEqual(product);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/products/tomate-organico');
  });

  it('fetchProductBySlug retorna null para produto inválido ou falha', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: null, meta: {}, error: { code: 'NOT_FOUND', message: 'x' } }));
    expect(await fetchProductBySlug('xyz')).toBeNull();

    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 'x' }, meta: {}, error: null }));
    expect(await fetchProductBySlug('x')).toBeNull();

    fetchMock.mockRejectedValue(new Error('down'));
    expect(await fetchProductBySlug('x')).toBeNull();
  });

  it('fetchReviewSummary retorna resumo quando disponível', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { average: 4.2, total: 8 }, meta: {}, error: null }));
    await expect(fetchReviewSummary('p1')).resolves.toEqual({ average: 4.2, total: 8 });
  });

  it('fetchReviewSummary retorna null em falha', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    await expect(fetchReviewSummary('p1')).resolves.toBeNull();
  });

  it('fetchCategoryBySlug retorna categoria válida', async () => {
    const cat = { id: 'c1', name: 'Hortaliças', slug: 'hortalicas', description: null, imageUrl: null };
    fetchMock.mockResolvedValue(jsonResponse(200, { data: cat, meta: {}, error: null }));
    await expect(fetchCategoryBySlug('hortalicas')).resolves.toEqual(cat);
  });

  it('fetchAllCategories retorna lista (ou vazio) e não lança', async () => {
    const cats = [{ id: 'c1', name: 'Hortaliças', slug: 'hortalicas', description: null, imageUrl: null }];
    fetchMock.mockResolvedValue(jsonResponse(200, { data: cats, meta: {}, error: null }));
    await expect(fetchAllCategories()).resolves.toHaveLength(1);

    fetchMock.mockResolvedValue(jsonResponse(200, { data: { notarray: true }, meta: {}, error: null }));
    await expect(fetchAllCategories()).resolves.toEqual([]);
  });

  it('fetchProductsForSitemap retorna lista ou vazio', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [product], meta: {}, error: null }));
    await expect(fetchProductsForSitemap()).resolves.toHaveLength(1);

    fetchMock.mockRejectedValue(new Error('down'));
    await expect(fetchProductsForSitemap()).resolves.toEqual([]);
  });
});
