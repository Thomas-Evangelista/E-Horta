export interface ApiEnvelope<T> {
  data: T;
  meta: { page?: number; limit?: number; total?: number; totalPages?: number };
  error: { code: string; message: string; details?: Array<{ field: string; message: string }> } | null;
}

export type ProductUnit = 'UN' | 'KG' | 'G' | 'PACK' | 'BUNCH';

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ProductSummaryDTO {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  unit: ProductUnit;
  price: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  category?: { id: string; name: string; slug: string };
  inventory?: { quantity: number; reservedQuantity: number } | null;
}

export interface ReviewAuthorDTO {
  id: string;
  name: string;
}

export interface ReviewDTO {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: ReviewAuthorDTO;
}

export interface ProductDetailDTO extends ProductSummaryDTO {
  description: string | null;
  sku: string;
  weight: string | null;
  productImages: Array<{ id: string; url: string; alt: string | null }>;
  reviews?: ReviewDTO[];
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'CUSTOMER' | 'OPERATOR' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  createdAt: string;
}

export interface TokensDTO {
  accessToken: string;
  refreshToken: string;
}

export interface CartItemDTO {
  id: string;
  productId: string;
  name: string;
  slug: string;
  sku: string;
  unit: ProductUnit;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  availableStock: number;
  hasEnoughStock: boolean;
}

export interface CartCouponDTO {
  code: string;
  name: string;
  type: string;
  discount: number;
  freeShipping: boolean;
  valid: boolean;
}

export interface CartDTO {
  id: string;
  status: string;
  items: CartItemDTO[];
  distinctItems: number;
  itemCount: number;
  subtotal: number;
  discount: number;
  coupon: CartCouponDTO | null;
}

const UNIT_LABELS: Record<ProductUnit, string> = {
  UN: 'unidade',
  KG: 'kg',
  G: 'g',
  PACK: 'pacote',
  BUNCH: 'maço',
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  unitLabel: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  isFeatured: boolean;
  inStock: boolean;
  category?: { id: string; name: string; slug: string };
}

export function mapProduct(dto: ProductSummaryDTO): Product {
  const quantity = dto.inventory ? dto.inventory.quantity - dto.inventory.reservedQuantity : null;
  return {
    id: dto.id,
    name: dto.name,
    slug: dto.slug,
    shortDescription: dto.shortDescription,
    unitLabel: UNIT_LABELS[dto.unit] ?? dto.unit.toLowerCase(),
    price: toNumber(dto.price),
    compareAtPrice: dto.compareAtPrice !== null ? toNumber(dto.compareAtPrice) : null,
    imageUrl: dto.imageUrl,
    isFeatured: dto.isFeatured,
    inStock: quantity === null ? true : quantity > 0,
    category: dto.category,
  };
}

export function mapProductDetail(dto: ProductDetailDTO): Product & {
  description: string | null;
  sku: string;
  gallery: Array<{ id: string; url: string; alt: string | null }>;
  reviews: ReviewDTO[];
} {
  return {
    ...mapProduct(dto),
    description: dto.description,
    sku: dto.sku,
    gallery: dto.productImages ?? [],
    reviews: dto.reviews ?? [],
  };
}

export interface AddressDTO {
  id: string;
  label: string | null;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  isDefault: boolean;
}

export type ShippingMethodDTO = 'STANDARD' | 'EXPRESS';

export interface ShippingOptionDTO {
  method: ShippingMethodDTO;
  label: string;
  description: string;
  fee: number;
  minEstimatedDays: number;
  maxEstimatedDays: number;
}

export type PaymentMethodDTO = 'PIX' | 'CARD' | 'CASH';

export interface CheckoutResponseDTO {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    shippingStatus: string;
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
    items: Array<{ productId: string; name: string; sku: string; unitPrice: number; quantity: number; total: number }>;
    notes: string | null;
    couponCode: string | null;
  };
  payment: {
    id: string;
    method: string;
    status: string;
    amount: number;
    charge: { provider: string; transactionId: string; qrCode: string | null; expiresAt: string | null } | null;
  };
}

export interface OrderPaymentViewDTO {
  paymentId: string;
  method: string;
  status: string;
  amount: number;
  transactionId: string | null;
  qrCode: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  attempts: number;
}

export type OrderStatusDTO =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_APPROVED'
  | 'PREPARING'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderDetailItemDTO {
  productId: string;
  slug: string | null;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface AddressSnapshotDTO {
  label?: string | null;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string | null;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface OrderDetailDTO {
  id: string;
  orderNumber: string;
  status: OrderStatusDTO;
  paymentStatus: string;
  shippingStatus: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  addressSnapshot: AddressSnapshotDTO | null;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  items: OrderDetailItemDTO[];
  shipping: {
    method: string;
    status: string;
    trackingCode: string | null;
    estimatedDays: number | null;
  } | null;
  payment: {
    method: string;
    status: string;
    amount: number;
    paidAt: string | null;
  } | null;
  paymentAttempts: number;
  cancellable: boolean;
}

export interface RepeatOrderResultDTO {
  addedItems: Array<{ productId: string; name: string; quantity: number }>;
  skippedItems: Array<{
    productId: string;
    name: string;
    reason: 'PRODUCT_UNAVAILABLE' | 'INSUFFICIENT_STOCK';
    availableStock?: number;
  }>;
}

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
