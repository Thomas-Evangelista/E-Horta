export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum ProductUnit {
  UN = 'UN',
  KG = 'KG',
  G = 'G',
  PACK = 'PACK',
  BUNCH = 'BUNCH',
}

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  CONVERTED = 'CONVERTED',
  ABANDONED = 'ABANDONED',
}

export enum PromotionType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PREPARING = 'PREPARING',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  PIX = 'PIX',
  CARD = 'CARD',
  CASH = 'CASH',
}

export enum ShippingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ApiResponse<T> {
  data: T | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  } | null;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
