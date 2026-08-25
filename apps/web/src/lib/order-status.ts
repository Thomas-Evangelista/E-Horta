import type { OrderStatusDTO } from '@/types/api';

export const ORDER_STATUS_LABELS: Record<OrderStatusDTO, string> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PAYMENT_APPROVED: 'Pago',
  PREPARING: 'Em preparo',
  READY_FOR_DELIVERY: 'Pronto para entrega',
  OUT_FOR_DELIVERY: 'Em rota',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatusDTO] ?? status;
}

/** Etapas da linha do tempo visível ao cliente (READY_FOR_DELIVERY conta como "Em preparo"). */
const TIMELINE_STAGES: Array<{ label: string; statuses: OrderStatusDTO[] }> = [
  { label: 'Pedido realizado', statuses: ['PENDING_PAYMENT'] },
  { label: 'Pagamento aprovado', statuses: ['PAYMENT_APPROVED'] },
  { label: 'Em preparo', statuses: ['PREPARING', 'READY_FOR_DELIVERY'] },
  { label: 'Em rota', statuses: ['OUT_FOR_DELIVERY'] },
  { label: 'Entregue', statuses: ['DELIVERED'] },
];

export interface TimelineStage {
  label: string;
  done: boolean;
  current: boolean;
}

/**
 * Linha do tempo do pedido. `null` quando cancelado (a UI exibe banner
 * próprio) ou status desconhecido.
 */
export function buildTimeline(status: string): TimelineStage[] | null {
  if (status === 'CANCELLED') return null;
  const currentIndex = TIMELINE_STAGES.findIndex((stage) =>
    stage.statuses.includes(status as OrderStatusDTO),
  );
  if (currentIndex === -1) return null;

  return TIMELINE_STAGES.map((stage, index) => ({
    label: stage.label,
    done: index < currentIndex,
    current: index === currentIndex,
  }));
}

export function isOrderDone(status: string): boolean {
  return status === 'DELIVERED';
}

export function isOrderCancelled(status: string): boolean {
  return status === 'CANCELLED';
}
