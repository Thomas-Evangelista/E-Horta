import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { Prisma, type PaymentMethod, type OrderStatus, type PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  PAYMENT_PROVIDER,
  type ChargeResult,
  type PaymentProvider,
} from './payment-provider.interface';
import {
  webhookPayloadSchema,
  type WebhookEventType,
  type WebhookPayload,
} from './payments.validation';
import { NotificationsService } from '../notifications/notifications.service';

const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';

export interface PaymentChargeView {
  provider: string;
  transactionId: string;
  qrCode: string | null;
  expiresAt: Date | null;
}

export interface OrderPaymentView {
  paymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionId: string | null;
  qrCode: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  attempts: number;
}

export interface WebhookProcessResult {
  received: boolean;
  duplicate: boolean;
  applied: boolean;
  reason?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

interface LockedPaymentRow {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Prisma.Decimal;
  metadata: Prisma.JsonValue | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryService,
    private readonly notificationsService: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  /**
   * Cria a cobrança no gateway para um pagamento recém-criado pelo checkout.
   * Falhas do gateway NUNCA derrubam o pedido: ele permanece criado e
   * PENDING_PAYMENT, e o cliente pode tentar novamente via retry.
   */
  async createInitialCharge(
    payment: { id: string; method: PaymentMethod; amount: Prisma.Decimal },
    order: { id: string; orderNumber: string },
  ): Promise<ChargeResult | null> {
    return this.chargePayment(payment, order);
  }

  async getByOrderForUser(userId: string, orderId: string): Promise<OrderPaymentView> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { payments: true } },
      },
    });

    if (!order || order.payments.length === 0) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    const latest = order.payments[0];
    const metadata = this.readMetadata(latest.metadata);

    return {
      paymentId: latest.id,
      method: latest.method,
      status: latest.status,
      amount: latest.amount.toNumber(),
      transactionId: latest.transactionId,
      qrCode: typeof metadata.qrCode === 'string' ? metadata.qrCode : null,
      expiresAt: this.readExpiresAt(metadata.expiresAt),
      paidAt: latest.paidAt,
      attempts: order._count.payments,
    };
  }

  /**
   * Nova tentativa de pagamento sobre um pedido ainda não pago.
   * Cria um novo registro de Payment (histórico de tentativas preservado).
   * Se a última tentativa ainda está PENDING, reutiliza a cobrança vigente.
   */
  async retryPayment(userId: string, orderId: string): Promise<OrderPaymentView> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new ConflictException({
        code: 'ORDER_NOT_PENDING',
        message: `Pedido não aceita nova tentativa de pagamento (status ${order.status})`,
      });
    }

    const latest = order.payments[0];

    if (!latest) {
      throw new NotFoundException('Nenhuma cobrança encontrada para o pedido');
    }

    if (latest.method === 'CASH') {
      throw new BadRequestException({
        code: 'PAYMENT_NO_GATEWAY',
        message: 'Pagamento na entrega não possui cobrança online',
      });
    }

    if (latest.status === 'PENDING') {
      const view = await this.getByOrderForUser(userId, orderId);
      return view;
    }

    if (latest.status === 'APPROVED') {
      throw new ConflictException({
        code: 'ALREADY_PAID',
        message: 'Pedido já possui pagamento aprovado',
      });
    }

    const created = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: latest.method,
        status: 'PENDING',
        amount: latest.amount,
      },
    });

    const charge = await this.chargePayment(created, order);

    this.logger.log(`New payment attempt ${created.id} for order ${order.orderNumber}`);

    return {
      paymentId: created.id,
      method: created.method,
      status: created.status,
      amount: created.amount.toNumber(),
      transactionId: charge?.transactionId ?? null,
      qrCode: charge?.qrCode ?? null,
      expiresAt: charge?.expiresAt ?? null,
      paidAt: null,
      attempts: order.payments.length + 1,
    };
  }

  /**
   * Processa webhook do gateway (spec #24):
   * valida assinatura HMAC-SHA256 do raw body, valida o evento,
   * registra em webhook_events (unique provider+eventId garante idempotência)
   * e aplica transições de estado sob lock da linha de pagamento.
   */
  async processWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    provider = this.paymentProvider.name,
  ): Promise<WebhookProcessResult> {
    if (!this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Assinatura de webhook inválida');
    }

    try {
      const payload = webhookPayloadSchema.parse(JSON.parse(rawBody.toString('utf8')));
      return await this.processWebhookEvent(provider, payload.eventType, payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Payload de webhook inválido');
    }
  }

  async processWebhookEvent(
    provider: string,
    eventType: WebhookEventType,
    payload: WebhookPayload,
  ): Promise<WebhookProcessResult> {
    // Capturado dentro da transação para notificar após o commit.
    let appliedOrderId: string | null = null;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Registro do evento primeiro: unique(provider, eventId) bloqueia
        // processamento duplicado mesmo sob concorrência.
        try {
          await tx.webhookEvent.create({
            data: {
              provider,
              eventId: payload.eventId,
              eventType,
              payload: payload as unknown as Prisma.InputJsonValue,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            return { duplicate: true as const };
          }
          throw error;
        }

        // Lock pessimista da linha para evitar corrida entre webhooks concorrentes.
        const rows = await tx.$queryRaw<LockedPaymentRow[]>`
          SELECT "id", "order_id", "method", "status", "amount", "metadata"
          FROM "payments"
          WHERE "id" = ${payload.data.paymentId}::uuid
          FOR UPDATE
        `;

        const payment = rows[0];

        if (!payment) {
          return { ignored: 'PAYMENT_NOT_FOUND' as const };
        }

        if (payment.status !== 'PENDING') {
          return { ignored: 'ALREADY_PROCESSED' as const };
        }

        if (Math.abs(payment.amount.toNumber() - payload.data.amount) > 0.01) {
          this.logger.warn(
            `Webhook ${payload.eventId}: amount mismatch for payment ${payment.id}`,
          );
          return { ignored: 'AMOUNT_MISMATCH' as const };
        }

        const items = await tx.orderItem.findMany({
          where: { orderId: payment.order_id },
          select: {
            productId: true,
            productNameSnapshot: true,
            skuSnapshot: true,
            quantity: true,
          },
        });

        const stockItems = items.map((item) => ({
          productId: item.productId,
          name: item.productNameSnapshot,
          sku: item.skuSnapshot,
          quantity: item.quantity,
        }));

        if (eventType === 'payment.approved') {
          appliedOrderId = payment.order_id;
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'APPROVED',
              paidAt: new Date(),
              transactionId: payload.data.providerPaymentId ?? null,
              metadata: this.mergeMetadata(payment.metadata, {
                providerPaymentId: payload.data.providerPaymentId ?? null,
              }),
            },
          });

          await tx.order.update({
            where: { id: payment.order_id },
            data: { status: 'PAYMENT_APPROVED', paymentStatus: 'APPROVED' },
          });

          // Pagamento confirmado: reserva vira baixa definitiva de estoque.
          await this.inventoryService.confirmReductions(tx, stockItems);

          return {
            applied: true as const,
            orderStatus: 'PAYMENT_APPROVED' as const,
            paymentStatus: 'APPROVED' as const,
          };
        }

        // payment.failed: libera reserva; pedido permanece PENDING_PAYMENT
        // para permitir nova tentativa sem criar outro pedido (spec #69).
        appliedOrderId = payment.order_id;
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            metadata: this.mergeMetadata(payment.metadata, {
              failReason: 'gateway_reported_failure',
              providerPaymentId: payload.data.providerPaymentId ?? null,
            }),
          },
        });

        await this.inventoryService.releaseReservations(tx, stockItems);

        return {
          applied: true as const,
          orderStatus: 'PENDING_PAYMENT' as const,
          paymentStatus: 'FAILED' as const,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    if ('duplicate' in result && result.duplicate) {
      this.logger.log(`Webhook event ${payload.eventId} already processed (duplicate)`);
      return { received: true, duplicate: true, applied: false };
    }

    if ('ignored' in result) {
      await this.markEventProcessed(provider, payload.eventId).catch(() => undefined);
      this.logger.log(`Webhook event ${payload.eventId} ignored: ${result.ignored}`);
      return { received: true, duplicate: false, applied: false, reason: result.ignored };
    }

    // Notifica o cliente fora da transação (spec #16): aprovação ou falha.
    if (appliedOrderId) {
      await this.notifyPaymentOutcome(appliedOrderId, result.orderStatus);
    }

    return { received: true, duplicate: false, ...result };
  }

  private async notifyPaymentOutcome(
    orderId: string,
    orderStatus: OrderStatus | undefined,
  ): Promise<void> {
    if (orderStatus !== 'PAYMENT_APPROVED' && orderStatus !== 'PENDING_PAYMENT') {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, orderNumber: true, total: true },
    });

    if (!order) {
      return;
    }

    this.notificationsService.notify(
      order.userId,
      orderStatus === 'PAYMENT_APPROVED' ? 'PAYMENT_APPROVED' : 'PAYMENT_FAILED',
      {
        orderId,
        orderNumber: order.orderNumber,
        total: order.total.toNumber(),
      },
    );
  }

  /**
   * Helper exclusivo de desenvolvimento/sandbox: constrói o payload assinado
   * exatamente como um gateway real enviaria e processa pelo mesmo caminho.
   */
  async simulateGatewayEvent(
    paymentId: string,
    outcome: 'approved' | 'failed',
  ): Promise<WebhookProcessResult> {
    const isSandboxDisabled =
      this.configService.get<string>('ENABLE_SANDBOX_SIMULATE') !== 'true';

    if (isSandboxDisabled) {
      throw new NotFoundException('Endpoint indisponível');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    const payload: WebhookPayload = {
      eventId: `evt_${randomUUID()}`,
      eventType: outcome === 'approved' ? 'payment.approved' : 'payment.failed',
      createdAt: new Date().toISOString(),
      data: {
        paymentId: payment.id,
        providerPaymentId: payment.transactionId ?? undefined,
        amount: payment.amount.toNumber(),
      },
    };

    const secret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!secret) {
      throw new BadRequestException('PAYMENT_WEBHOOK_SECRET não configurado');
    }

    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    return this.processWebhook(body, signature);
  }

  getSignatureHeaderName(): string {
    return WEBHOOK_SIGNATURE_HEADER;
  }

  private async chargePayment(
    payment: { id: string; method: PaymentMethod; amount: Prisma.Decimal },
    order: { id: string; orderNumber: string },
  ): Promise<ChargeResult | null> {
    if (payment.method === 'CASH') {
      return null;
    }

    try {
      const charge = await this.paymentProvider.createCharge({
        paymentId: payment.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        method: payment.method,
        amount: payment.amount.toNumber(),
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          transactionId: charge.transactionId,
          metadata: {
            ...(charge.metadata ?? {}),
            qrCode: charge.qrCode,
            expiresAt: charge.expiresAt?.toISOString() ?? null,
            provider: charge.provider,
          },
        },
      });

      return charge;
    } catch (error) {
      // Cobrança é recuperável via POST /payments/order/:id/retry.
      this.logger.error(
        `Failed to create charge for payment ${payment.id}: ${String(error)}`,
      );
      return null;
    }
  }

  private verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!secret || !signature) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  private async markEventProcessed(provider: string, eventId: string): Promise<void> {
    await this.prisma.webhookEvent.updateMany({
      where: { provider, eventId },
      data: { processedAt: new Date() },
    });
  }

  private readMetadata(metadata: Prisma.JsonValue | null): Record<string, unknown> {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      return metadata as Record<string, unknown>;
    }
    return {};
  }

  private readExpiresAt(value: unknown): Date | null {
    if (typeof value !== 'string') {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private mergeMetadata(
    current: Prisma.JsonValue | null,
    patch: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    return {
      ...this.readMetadata(current),
      ...patch,
    } as Prisma.InputJsonValue;
  }
}
