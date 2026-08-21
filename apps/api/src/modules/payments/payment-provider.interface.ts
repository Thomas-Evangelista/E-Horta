import type { PaymentMethod } from '@prisma/client';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export interface CreateChargeInput {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  method: PaymentMethod;
  amount: number;
}

export interface ChargeResult {
  provider: string;
  transactionId: string;
  status: 'PENDING' | 'APPROVED' | 'FAILED';
  qrCode: string | null;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Abstração de gateway de pagamento (spec #22). A aplicação nunca depende
 * de um gateway concreto: implementações são selecionadas via env
 * PAYMENT_PROVIDER e devem substituir-se sem alterar regra de negócio.
 */
export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(transactionId: string): Promise<ChargeResult | null>;
  cancelCharge?(transactionId: string): Promise<void>;
}
