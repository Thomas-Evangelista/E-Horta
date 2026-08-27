import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatDiscount, formatPrice, formatRelativeTime } from '../format';

describe('formatPrice', () => {
  it('formata valores em BRL', () => {
    expect(formatPrice(10.5)).toMatch(/R\$\u00A0?10,50/);
    expect(formatPrice(0)).toMatch(/R\$\u00A0?0,00/);
    expect(formatPrice(1234.56)).toMatch(/R\$\u00A0?1\.234,56/);
  });

  it('arredonda para centavos', () => {
    expect(formatPrice(0.1 + 0.2)).toMatch(/R\$\u00A0?0,30/);
  });
});

describe('formatDiscount', () => {
  it('calcula porcentagem de desconto (price, compareAt)', () => {
    expect(formatDiscount(8, 10)).toBe(20);
    expect(formatDiscount(75, 100)).toBe(25);
    expect(formatDiscount(8, 9)).toBe(11);
  });

  it('retorna 0 quando preço promocional >= preço original', () => {
    expect(formatDiscount(10, 10)).toBe(0);
    expect(formatDiscount(11, 10)).toBe(0);
  });
});

describe('formatDate', () => {
  it('formata data ISO no padrão pt-BR', () => {
    expect(formatDate('2026-08-27T00:00:00.000Z')).toBe('27/08/2026');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-27T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna "agora" para menos de 1 minuto', () => {
    expect(formatRelativeTime('2026-08-27T11:59:30.000Z')).toBe('agora');
  });

  it('retorna minutos para menos de 1 hora', () => {
    expect(formatRelativeTime('2026-08-27T11:55:00.000Z')).toBe('há 5 min');
  });

  it('retorna horas para menos de 1 dia', () => {
    expect(formatRelativeTime('2026-08-27T10:00:00.000Z')).toBe('há 2 h');
  });

  it('retorna "ontem" entre 24h e 48h', () => {
    expect(formatRelativeTime('2026-08-26T08:00:00.000Z')).toBe('ontem');
  });

  it('retorna data por extenso após 48h', () => {
    expect(formatRelativeTime('2026-08-25T00:00:00.000Z')).toBe('25/08/2026');
  });
});