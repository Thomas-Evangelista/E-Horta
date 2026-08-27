import { describe, expect, it } from 'vitest';
import {
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  PROMOTION_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
} from '../constants';

describe('ORDER_STATUS_LABELS', () => {
  it('cobre todos os status do pedido', () => {
    const statuses = [
      'PENDING_PAYMENT',
      'PAYMENT_APPROVED',
      'PREPARING',
      'READY_FOR_DELIVERY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];
    for (const s of statuses) {
      expect(ORDER_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});

describe('ORDER_TRANSITIONS', () => {
  it('pedido pago não cancela após separação', () => {
    expect(ORDER_TRANSITIONS.PREPARING).toEqual(['READY_FOR_DELIVERY']);
    expect(ORDER_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('mostra máquina de estados coerente', () => {
    expect(ORDER_TRANSITIONS.PENDING_PAYMENT).toEqual(['PAYMENT_APPROVED', 'CANCELLED']);
    expect(ORDER_TRANSITIONS.OUT_FOR_DELIVERY).toEqual(['DELIVERED']);
  });
});

describe('labels de domínio', () => {
  it('mapeia papéis e status de usuário', () => {
    expect(USER_ROLE_LABELS.ADMIN).toBe('Admin');
    expect(USER_STATUS_LABELS.BLOCKED).toBe('Bloqueado');
  });

  it('mapeia moderação e promoções', () => {
    expect(REVIEW_STATUS_LABELS.REJECTED).toBe('Rejeitado');
    expect(PROMOTION_TYPE_LABELS.FREE_SHIPPING).toBe('Frete grátis');
  });
});