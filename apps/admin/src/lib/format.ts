const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num = new Intl.NumberFormat('pt-BR');
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function formatPrice(value: number): string {
  return brl.format(value);
}

export function formatNumber(value: number): string {
  return num.format(value);
}

export function formatDate(value: string | Date): string {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFmt.format(new Date(value));
}

export function formatRelativeTime(value: string | Date): string {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return 'ontem';
  return dateFmt.format(new Date(value));
}

export function formatDiscount(compareAt: number, price: number): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
