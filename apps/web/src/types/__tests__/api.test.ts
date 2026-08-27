import { describe, expect, it } from 'vitest';
import { mapProduct, mapProductDetail, type ProductSummaryDTO } from '../api';

const baseDto: ProductSummaryDTO = {
  id: 'p1',
  name: 'Alface',
  slug: 'alface',
  shortDescription: 'Folhas frescas',
  unit: 'UN',
  price: '4.50',
  compareAtPrice: '6.00',
  imageUrl: 'http://img/alface.jpg',
  isFeatured: true,
  inventory: { quantity: 10, reservedQuantity: 2 },
};

describe('mapProduct', () => {
  it('converte DTO da API para produto consumível pelo frontend', () => {
    const product = mapProduct(baseDto);
    expect(product.price).toBe(4.5);
    expect(product.compareAtPrice).toBe(6);
    expect(product.unitLabel).toBe('unidade');
    expect(product.inStock).toBe(true);
  });

  it('traduz unidades', () => {
    expect(mapProduct({ ...baseDto, unit: 'KG' }).unitLabel).toBe('kg');
    expect(mapProduct({ ...baseDto, unit: 'BUNCH' }).unitLabel).toBe('maço');
  });

  it('considera indisponível quando estoque disponível <= 0', () => {
    expect(mapProduct({ ...baseDto, inventory: { quantity: 2, reservedQuantity: 2 } }).inStock).toBe(false);
    expect(mapProduct({ ...baseDto, inventory: { quantity: 0, reservedQuantity: 0 } }).inStock).toBe(false);
  });

  it('considera disponível quando não há inventário', () => {
    const { inventory: _inventory, ...semEstoque } = baseDto;
    expect(mapProduct(semEstoque).inStock).toBe(true);
  });
});

describe('mapProductDetail', () => {
  it('adiciona galeria, descrição e reviews', () => {
    const details = mapProductDetail({
      ...baseDto,
      description: 'Alface americana',
      sku: 'SKU-1',
      weight: null,
      productImages: [{ id: 'i1', url: 'http://img/1.jpg', alt: null }],
      reviews: [],
    });
    expect(details.description).toBe('Alface americana');
    expect(details.gallery).toHaveLength(1);
    expect(details.reviews).toEqual([]);
  });
});