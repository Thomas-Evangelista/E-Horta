import type { OrderStatus } from '@prisma/client';
import {
  getAllowedTransitions,
  isValidTransition,
  isCustomerCancellable,
  ORDER_STATUS_TRANSITIONS,
} from './order-transitions';

const ALL_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PAYMENT_APPROVED',
  'PREPARING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

describe('order-transitions (máquina de estados do pedido)', () => {
  describe('ORDER_STATUS_TRANSITIONS', () => {
    it('cobre todos os status', () => {
      for (const status of ALL_STATUSES) {
        expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
      }
    });

    it('não contém auto-transições ou ciclos diretos', () => {
      for (const [from, targets] of Object.entries(ORDER_STATUS_TRANSITIONS)) {
        expect(targets).not.toContain(from);
      }
    });
  });

  describe('getAllowedTransitions', () => {
    it('deve seguir o fluxo normal do pedido', () => {
      expect(getAllowedTransitions('PENDING_PAYMENT')).toContain('PAYMENT_APPROVED');
      expect(getAllowedTransitions('PAYMENT_APPROVED')).toContain('PREPARING');
      expect(getAllowedTransitions('PREPARING')).toContain('READY_FOR_DELIVERY');
      expect(getAllowedTransitions('READY_FOR_DELIVERY')).toContain('OUT_FOR_DELIVERY');
      expect(getAllowedTransitions('OUT_FOR_DELIVERY')).toContain('DELIVERED');
    });

    it('DELIVERED e CANCELLED são estados terminais', () => {
      expect(getAllowedTransitions('DELIVERED')).toEqual([]);
      expect(getAllowedTransitions('CANCELLED')).toEqual([]);
    });

    it('PENDING_PAYMENT pode ser cancelado pelo fluxo', () => {
      expect(getAllowedTransitions('PENDING_PAYMENT')).toContain('CANCELLED');
    });
  });

  describe('isValidTransition', () => {
    it('retorna true para transição válida', () => {
      expect(isValidTransition('PAYMENT_APPROVED', 'PREPARING')).toBe(true);
      expect(isValidTransition('PREPARING', 'READY_FOR_DELIVERY')).toBe(true);
      expect(isValidTransition('READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY')).toBe(true);
      expect(isValidTransition('OUT_FOR_DELIVERY', 'DELIVERED')).toBe(true);
    });

    it('retorna false para transição inválida (pula etapa)', () => {
      expect(isValidTransition('PENDING_PAYMENT', 'DELIVERED')).toBe(false);
      expect(isValidTransition('PREPARING', 'DELIVERED')).toBe(false);
      expect(isValidTransition('PENDING_PAYMENT', 'OUT_FOR_DELIVERY')).toBe(false);
    });

    it('não permite regressão', () => {
      expect(isValidTransition('DELIVERED', 'OUT_FOR_DELIVERY')).toBe(false);
      expect(isValidTransition('PAYMENT_APPROVED', 'PENDING_PAYMENT')).toBe(false);
      expect(isValidTransition('PREPARING', 'PAYMENT_APPROVED')).toBe(false);
    });

    it('retorna false para mesma etapa (auto-transição)', () => {
      expect(isValidTransition('PREPARING', 'PREPARING')).toBe(false);
    });

    it('não permite cancelar depois de iniciada a separação', () => {
      expect(isValidTransition('PAYMENT_APPROVED', 'CANCELLED')).toBe(true);
      expect(isValidTransition('PREPARING', 'CANCELLED')).toBe(true);
      expect(isValidTransition('READY_FOR_DELIVERY', 'CANCELLED')).toBe(false);
    });
  });

  describe('isCustomerCancellable', () => {
    it('permite o cliente cancelar apenas em PENDING_PAYMENT', () => {
      expect(isCustomerCancellable('PENDING_PAYMENT')).toBe(true);
    });

    it('nega cancelamento pelo cliente nos demais status', () => {
      for (const status of [
        'PAYMENT_APPROVED',
        'PREPARING',
        'READY_FOR_DELIVERY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ] as OrderStatus[]) {
        expect(isCustomerCancellable(status)).toBe(false);
      }
    });
  });
});
