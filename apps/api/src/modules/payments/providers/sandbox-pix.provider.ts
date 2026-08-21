import { randomUUID } from 'crypto';
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
} from '../payment-provider.interface';

const PIX_CHARGE_TTL_MINUTES = 30;

/**
 * ADAPTER SANDBOX — NÃO usar em produção.
 *
 * Implementação do PaymentProvider para desenvolvimento/testes, usada enquanto
 * nenhum gateway real (Mercado Pago, Stripe, PagSeguro etc.) estiver contratado.
 * Gera um payload de "QR Code" fictício e um transactionId determinístico.
 * A aprovação só ocorre através do fluxo oficial de webhook assinado
 * (POST /api/v1/webhooks/payments), simulando fielmente o comportamento de
 * um gateway real — inclusive a exigência de assinatura HMAC válida.
 */
export class SandboxPixProvider implements PaymentProvider {
  readonly name = 'sandbox';

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const txId = `EHSBX${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    return {
      provider: this.name,
      transactionId: txId,
      status: 'PENDING',
      qrCode: this.buildQrCodePayload(txId, input),
      expiresAt: new Date(Date.now() + PIX_CHARGE_TTL_MINUTES * 60 * 1000),
      metadata: {
        sandbox: true,
        orderNumber: input.orderNumber,
        note: 'QR Code simulado (sandbox). Aprovação via webhook assinado.',
      },
    };
  }

  async getCharge(transactionId: string): Promise<ChargeResult | null> {
    if (!transactionId.startsWith('EHSBX')) {
      return null;
    }

    return {
      provider: this.name,
      transactionId,
      status: 'PENDING',
      qrCode: null,
      expiresAt: null,
      metadata: { sandbox: true },
    };
  }

  private buildQrCodePayload(txId: string, input: CreateChargeInput): string {
    const amountPart = input.amount.toFixed(2);
    // Payload EMV-like simplificado, apenas para representação visual no sandbox.
    return [
      '00020126',
      `BR.GOV.BCB.PIX01E-HORTA-SANDBOX`,
      '52040000',
      '5303986',
      '54' + amountPart.length.toString().padStart(2, '0') + amountPart,
      '5802BR',
      '5915E-HORTA SANDBOX',
      '6009SAO PAULO',
      `62${(txId.length + 4).toString().padStart(2, '0')}05${txId.length.toString().padStart(2, '0')}${txId}`,
      '6304SANDBOX',
    ].join('');
  }
}
