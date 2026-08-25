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

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "agora", "há 5 min", "há 2 h", "ontem", data por extenso após 48h. */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const elapsed = Date.now() - date.getTime();

  if (elapsed < MINUTE) return 'agora';
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `há ${minutes} min`;
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `há ${hours} h`;
  }
  if (elapsed < 2 * DAY) return 'ontem';
  return formatDate(iso);
}
