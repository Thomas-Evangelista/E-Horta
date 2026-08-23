import type { OrderStatus } from '@prisma/client';

/**
 * Máquina de estados do pedido (specs/11-pedidos.md).
 *
 * Fluxo normal:
 *   PENDING_PAYMENT → PAYMENT_APPROVED → PREPARING → READY_FOR_DELIVERY
 *     → OUT_FOR_DELIVERY → DELIVERED
 *
 * Cancelamento (CANCELLED) é permitido apenas antes da separação:
 * depois de pago, o estorno é responsabilidade do fluxo administrativo.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ['PAYMENT_APPROVED', 'CANCELLED'],
  PAYMENT_APPROVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Status a partir dos quais o próprio cliente pode cancelar o pedido. */
const CUSTOMER_CANCELLABLE_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'PENDING_PAYMENT',
]);

export function getAllowedTransitions(status: OrderStatus): readonly OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status] ?? [];
}

/** Transição válida segundo a máquina de estados (uso administrativo). */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) {
    return false;
  }
  return getAllowedTransitions(from).includes(to);
}

/** Indica se o cliente autenticado pode cancelar o pedido neste status. */
export function isCustomerCancellable(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.has(status);
}
