const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPrice(value: number): string {
  return brl.format(value);
}

export function formatDiscount(price: number, compareAt: number): number {
  if (compareAt <= price) return 0;
  return Math.round((1 - price / compareAt) * 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}
