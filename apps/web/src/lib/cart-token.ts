const CART_TOKEN_KEY = 'e-horta.cartToken';

export function getStoredCartToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeCartToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    // storage indisponível (modo privado etc.) — carrinho anônimo não persiste
  }
}

export function clearStoredCartToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CART_TOKEN_KEY);
  } catch {
    // idem
  }
}
