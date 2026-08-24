import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.interface';
import { PrismaService } from '../../database/prisma.service';

const WEBHOOK_SECRET = 'whsec_test_1234567890abcdef';

const sign = (body: Buffer): string =>
  createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

const buildPayload = (overrides: Record<string, unknown> = {}) => ({
  eventId: `evt_${Date.now()}`,
  eventType: 'payment.approved' as const,
  data: {
    paymentId: '11111111-2222-4333-8444-555555555555',
    amount: 23.7,
  },
  ...overrides,
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    webhookEvent: { create: jest.Mock; updateMany: jest.Mock };
    $queryRaw: jest.Mock;
    orderItem: { findMany: jest.Mock };
    payment: { update: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    order: { update: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock };
    _count?: unknown;
    $transaction: jest.Mock;
  };
  let inventoryService: { confirmReductions: jest.Mock; releaseReservations: jest.Mock };
  let notificationsService: { notify: jest.Mock };
  let provider: PaymentProvider;

  const lockedPaymentRow = {
    id: 'payment-1',
    order_id: 'order-1',
    method: 'PIX',
    status: 'PENDING',
    amount: new Prisma.Decimal('23.70'),
    metadata: Prisma.JsonNull,
  };

  const orderItems = [
    {
      productId: 'product-1',
      productNameSnapshot: 'Alface',
      skuSnapshot: 'ALF-001',
      quantity: 2,
    },
  ];

  beforeEach(async () => {
    prisma = {
      webhookEvent: {
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([lockedPaymentRow]),
      orderItem: { findMany: jest.fn().mockResolvedValue(orderItems) },
      payment: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn(), create: jest.fn() },
      order: { update: jest.fn().mockResolvedValue({}), findFirst: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    inventoryService = {
      confirmReductions: jest.fn().mockResolvedValue(undefined),
      releaseReservations: jest.fn().mockResolvedValue(undefined),
    };

    notificationsService = {
      notify: jest.fn(),
    };

    provider = {
      name: 'sandbox',
      createCharge: jest.fn().mockResolvedValue({
        provider: 'sandbox',
        transactionId: 'EHSBX123',
        status: 'PENDING' as const,
        qrCode: 'qr-payload',
        expiresAt: null,
        metadata: null,
      }),
      getCharge: jest.fn().mockResolvedValue(null),
    };

    const configService = {
      get: jest.fn((key: string) =>
        key === 'PAYMENT_WEBHOOK_SECRET' ? WEBHOOK_SECRET : undefined,
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: PAYMENT_PROVIDER, useValue: provider },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
  });

  describe('webhook — validação', () => {
    it('deve rejeitar assinatura inválida sem tocar no banco', async () => {
      const body = Buffer.from(JSON.stringify(buildPayload()));

      await expect(service.processWebhook(body, 'assinatura-invalida')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando o secret não está configurado (fail closed)', async () => {
      const body = Buffer.from(JSON.stringify(buildPayload()));
      // service com secret ausente
      const moduleRef = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
          { provide: InventoryService, useValue: inventoryService },
          { provide: NotificationsService, useValue: notificationsService },
          { provide: PAYMENT_PROVIDER, useValue: provider },
        ],
      }).compile();
      const noSecretService = moduleRef.get(PaymentsService);

      await expect(noSecretService.processWebhook(body, sign(body))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('deve rejeitar payload que viola o schema', async () => {
      const body = Buffer.from(JSON.stringify({ foo: 'bar' }));

      await expect(service.processWebhook(body, sign(body))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('webhook — processamento', () => {
    it('deve aprovar pagamento, mover pedido para PAYMENT_APPROVED e confirmar baixa de estoque', async () => {
      const payload = buildPayload();

      const result = await service.processWebhookEvent(
        'sandbox',
        'payment.approved',
        payload,
      );

      expect(result.applied).toBe(true);
      expect(result.orderStatus).toBe('PAYMENT_APPROVED');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: lockedPaymentRow.id },
        data: expect.objectContaining({ status: 'APPROVED', paidAt: expect.any(Date) }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAYMENT_APPROVED', paymentStatus: 'APPROVED' },
      });
      expect(inventoryService.confirmReductions).toHaveBeenCalledWith(
        expect.anything(),
        [
          expect.objectContaining({
            productId: 'product-1',
            name: 'Alface',
            sku: 'ALF-001',
            quantity: 2,
          }),
        ],
      );
      expect(inventoryService.releaseReservations).not.toHaveBeenCalled();
    });

    it('deve marcar evento duplicado e não reprocessar', async () => {
      prisma.webhookEvent.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      const result = await service.processWebhookEvent('sandbox', 'payment.approved', buildPayload());

      expect(result.duplicate).toBe(true);
      expect(result.applied).toBe(false);
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('deve liberar reserva em payment.failed mantendo pedido PENDING_PAYMENT', async () => {
      const result = await service.processWebhookEvent('sandbox', 'payment.failed', buildPayload());

      expect(result.applied).toBe(true);
      expect(result.orderStatus).toBe('PENDING_PAYMENT');
      expect(result.paymentStatus).toBe('FAILED');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: lockedPaymentRow.id },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
      expect(inventoryService.releaseReservations).toHaveBeenCalled();
      expect(inventoryService.confirmReductions).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('deve ignorar pagamento já processado (status diferente de PENDING)', async () => {
      prisma.$queryRaw.mockResolvedValue([{ ...lockedPaymentRow, status: 'APPROVED' }]);

      const result = await service.processWebhookEvent('sandbox', 'payment.approved', buildPayload());

      expect(result.applied).toBe(false);
      expect(result.reason).toBe('ALREADY_PROCESSED');
      expect(inventoryService.confirmReductions).not.toHaveBeenCalled();
    });

    it('deve ignorar evento com valor divergente do pagamento', async () => {
      const result = await service.processWebhookEvent(
        'sandbox',
        'payment.approved',
        buildPayload({ data: { paymentId: '11111111-2222-4333-8444-555555555555', amount: 999 } }),
      );

      expect(result.reason).toBe('AMOUNT_MISMATCH');
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('deve ignorar evento para pagamento inexistente', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.processWebhookEvent('sandbox', 'payment.approved', buildPayload());

      expect(result.reason).toBe('PAYMENT_NOT_FOUND');
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('deve registrar o evento antes do processamento (auditoria)', async () => {
      await service.processWebhookEvent('sandbox', 'payment.approved', buildPayload());

      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'sandbox',
          eventId: expect.stringMatching(/^evt_/),
          eventType: 'payment.approved',
        }),
      });
    });
  });

  describe('retryPayment', () => {
    const orderId = 'order-1';

    it('deve criar nova tentativa quando a última falhou', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: orderId,
        orderNumber: 'EH-20260821-AAA001',
        status: 'PENDING_PAYMENT',
        payments: [{ id: 'payment-old', method: 'PIX', status: 'FAILED', amount: new Prisma.Decimal('23.70') }],
        _count: { payments: 1 },
      });
      prisma.payment.create.mockResolvedValue({
        id: 'payment-new',
        method: 'PIX',
        status: 'PENDING',
        amount: new Prisma.Decimal('23.70'),
      });

      const result = await service.retryPayment('user-1', orderId);

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          orderId,
          method: 'PIX',
          status: 'PENDING',
          amount: new Prisma.Decimal('23.70'),
        },
      });
      expect(result.attempts).toBe(2);
    });

    it('deve reutilizar cobrança pendente sem criar duplicata', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: orderId,
        orderNumber: 'EH-20260821-AAA001',
        status: 'PENDING_PAYMENT',
        payments: [{ id: 'payment-current', method: 'PIX', status: 'PENDING', amount: new Prisma.Decimal('23.70') }],
        _count: { payments: 1 },
      });

      await service.retryPayment('user-1', orderId);

      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('deve recusar retry de pedido já pago', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: orderId,
        status: 'PAYMENT_APPROVED',
        payments: [{ id: 'p', method: 'PIX', status: 'APPROVED', amount: new Prisma.Decimal(10) }],
        _count: { payments: 1 },
      });

      await expect(service.retryPayment('user-1', orderId)).rejects.toBeInstanceOf(ConflictException);
    });

    it('deve recusar retry de CASH (sem gateway online)', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: orderId,
        status: 'PENDING_PAYMENT',
        payments: [{ id: 'p', method: 'CASH', status: 'FAILED', amount: new Prisma.Decimal(10) }],
        _count: { payments: 1 },
      });

      await expect(service.retryPayment('user-1', orderId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deve lançar NotFound para pedido de outro usuário', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.retryPayment('user-1', orderId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
