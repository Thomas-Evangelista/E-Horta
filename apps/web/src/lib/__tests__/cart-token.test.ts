import { afterEach, describe, expect, it } from 'vitest';
import { clearStoredCartToken, getStoredCartToken, storeCartToken } from '../cart-token';

const KEY = 'e-horta.cartToken';

afterEach(() => {
  window.localStorage.clear();
});

describe('cart-token helpers', () => {
  it('retorna null quando não há token', () => {
    expect(getStoredCartToken()).toBeNull();
  });

  it('persiste e lê o token', () => {
    storeCartToken('token-abc');
    expect(getStoredCartToken()).toBe('token-abc');
    expect(window.localStorage.getItem(KEY)).toBe('token-abc');
  });

  it('limpa o token', () => {
    storeCartToken('token-abc');
    clearStoredCartToken();
    expect(getStoredCartToken()).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});