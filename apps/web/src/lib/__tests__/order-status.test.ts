import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  isOrderCancelled,
  isOrderDone,
  orderStatusLabel,
} from '../order-status';

describe('orderStatusLabel', () => {
  it('traduz status conhecidos', () => {
    expect(orderStatusLabel('PENDING_PAYMENT')).toBe('Aguardando pagamento');
    expect(orderStatusLabel('DELIVERED')).toBe('Entregue');
    expect(orderStatusLabel('CANCELLED')).toBe('Cancelado');
  });

  it('mantém status desconhecido como está', () => {
    expect(orderStatusLabel('PENDING')).toBe('PENDING');
  });
});

describe('buildTimeline', () => {
  it('retorna null para pedido cancelado', () => {
    expect(buildTimeline('CANCELLED')).toBeNull();
  });

  it('retorna null para status desconhecido', () => {
    expect(buildTimeline('UNKNOWN')).toBeNull();
  });

  it('estágio atual é marcado e anteriores concluídos', () => {
    const timeline = buildTimeline('OUT_FOR_DELIVERY');
    expect(timeline).not.toBeNull();
    expect(timeline!.map((s) => s.label)).toEqual([
      'Pedido realizado',
      'Pagamento aprovado',
      'Em preparo',
      'Em rota',
      'Entregue',
    ]);
    const emRota = timeline!.find((s) => s.label === 'Em rota');
    expect(emRota?.current).toBe(true);
    expect(timeline!.filter((s) => s.done).map((s) => s.label)).toEqual([
      'Pedido realizado',
      'Pagamento aprovado',
      'Em preparo',
    ]);
  });

  it('READY_FOR_DELIVERY conta como "Em preparo"', () => {
    const timeline = buildTimeline('READY_FOR_DELIVERY');
    const emPreparo = timeline!.find((s) => s.label === 'Em preparo');
    expect(emPreparo?.current).toBe(true);
  });

  it('após entrega os estágios anteriores estão concluídos e a entrega é o atual', () => {
    const timeline = buildTimeline('DELIVERED');
    expect(timeline!.filter((s) => s.done).map((s) => s.label)).toEqual([
      'Pedido realizado',
      'Pagamento aprovado',
      'Em preparo',
      'Em rota',
    ]);
    expect(timeline!.find((s) => s.label === 'Entregue')?.current).toBe(true);
  });
});

describe('isOrderDone / isOrderCancelled', () => {
  it('considera entregue como concluído', () => {
    expect(isOrderDone('DELIVERED')).toBe(true);
    expect(isOrderDone('PREPARING')).toBe(false);
  });

  it('detecta pedido cancelado', () => {
    expect(isOrderCancelled('CANCELLED')).toBe(true);
    expect(isOrderCancelled('DELIVERED')).toBe(false);
  });
});