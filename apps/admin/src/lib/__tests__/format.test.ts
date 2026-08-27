import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatDiscount, formatNumber, formatPrice } from '../format';

describe('formatPrice', () => {
  it('formata valores em BRL', () => {
    expect(formatPrice(10.5)).toMatch(/R\$\u00A0?10,50/);
    expect(formatPrice(1234.56)).toMatch(/R\$\u00A0?1\.234,56/);
  });
});

describe('formatNumber', () => {
  it('agrupa milhares', () => {
    expect(formatNumber(1200)).toMatch(/1\.200/);
  });
});

describe('formatDate / formatDateTime', () => {
  it('formata data no padrão pt-BR', () => {
    expect(formatDate('2026-08-27T00:00:00.000Z')).toBe('27/08/2026');
    expect(formatDateTime('2026-08-27T14:30:00.000Z')).toMatch(/27\/08\/2026/);
  });
});

describe('formatDiscount', () => {
  it('calcula desconto percentual', () => {
    expect(formatDiscount(10, 8)).toBe(20);
    expect(formatDiscount(10, 10)).toBe(0);
    expect(formatDiscount(10, 11)).toBe(0);
  });
});