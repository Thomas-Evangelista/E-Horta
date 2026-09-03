export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pendente',
  PAYMENT_APPROVED: 'Aprovado',
  PREPARING: 'Preparando',
  READY_FOR_DELIVERY: 'Pronto',
  OUT_FOR_DELIVERY: 'Entregando',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-600',
  PAYMENT_APPROVED: 'bg-blue-100 text-blue-600',
  PREPARING: 'bg-accent-100 text-accent-700',
  READY_FOR_DELIVERY: 'bg-leaf-100 text-leaf-700',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-600',
  DELIVERED: 'bg-leaf-50 text-leaf-600',
  CANCELLED: 'bg-red-100 text-red-600',
};

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_APPROVED', 'CANCELLED'],
  PAYMENT_APPROVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const USER_ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  OPERATOR: 'Operador',
  ADMIN: 'Admin',
};

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado',
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

export const PROMOTION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: 'Percentual',
  FIXED: 'Fixo',
  FREE_SHIPPING: 'Frete grátis',
};
