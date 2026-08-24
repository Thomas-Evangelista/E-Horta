import { Test } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../database/prisma.service';

const decimal = (value: string) => new Prisma.Decimal(value);

const buildOrderRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-1',
  orderNumber: 'EH-20260101-ABC123',
  userId: 'user-1',
  status: 'PENDING_PAYMENT',
  paymentStatus: 'PENDING',
  shippingStatus: 'PENDING',
  subtotal: decimal('23.70'),
  discount: decimal('0'),
  shippingFee: decimal('9.90'),
  total: decimal('33.60'),
  addressSnapshot: { street: 'Rua das Hortaliças' },
  notes: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      productId: 'product-1',
      productNameSnapshot: 'Alface Crespa',
      skuSnapshot: 'ALF-001',
      unitPrice: decimal('9.90'),
      quantity: 2,
      total: decimal('19.80'),
    },
    {
      id: 'item-2',
      orderId: 'order-1',
      productId: 'product-2',
      productNameSnapshot: 'Rúcula',
      skuSnapshot: 'RUC-001',
      unitPrice: decimal('3.90'),
      quantity: 1,
      total: decimal('3.90'),
    },
  ],
  shipping: {
    method: 'STANDARD',
    status: 'PENDING',
    trackingCode: null,
    estimatedDays: 2,
  },
  payments: [
    {
      method: 'PIX',
      status: 'PENDING',
      amount: decimal('33.60'),
      paidAt: null,
    },
  ],
  _count: { payments: 1 },
  ...overrides,
});

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    order: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    orderItem: { findMany: jest.Mock };
    payment: { updateMany: jest.Mock };
    product: { findUnique: jest.Mock };
    cartItem: {
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    shipping: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let inventoryService: { releaseReservations: jest.Mock };
  let cartService: {
    resolveActiveCart: jest.Mock;
    getCart: jest.Mock;
  };
  let notificationsService: { notify: jest.Mock };

  const activeCart = { id: 'cart-1', userId: 'user-1', status: 'ACTIVE' };
  const emptyCartResponse = {
    id: 'cart-1',
    status: 'ACTIVE',
    items: [],
    distinctItems: 0,
    itemCount: 0,
    subtotal: 0,
    discount: 0,
    coupon: null,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      order: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      orderItem: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      product: { findUnique: jest.fn() },
      cartItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      shipping: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    inventoryService = {
      releaseReservations: jest.fn().mockResolvedValue(undefined),
    };

    cartService = {
      resolveActiveCart: jest.fn().mockResolvedValue(activeCart),
      getCart: jest.fn().mockResolvedValue(emptyCartResponse),
    };

    notificationsService = {
      notify: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventoryService },
        { provide: CartService, useValue: cartService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);

    // Transação em array: [count, orders]. Em função: executa com o próprio mock.
    prisma.$transaction.mockImplementation(async (input) =>
      Array.isArray(input)
        ? Promise.all(input)
        : (input as (tx: unknown) => Promise<unknown>)(prisma),
    );
  });

  describe('findAllByUser', () => {
    it('deve retornar pedidos mapeados com flag de cancelamento e meta de paginação', async () => {
      prisma.order.count.mockResolvedValue(1);
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          orderNumber: 'EH-20260101-ABC123',
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING',
          total: decimal('33.60'),
          createdAt: new Date('2026-01-01T10:00:00Z'),
          items: [{ quantity: 2 }, { quantity: 1 }],
        },
      ]);

      const result = await service.findAllByUser('user-1', 1, 20);

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0]).toMatchObject({
        id: 'order-1',
        total: 33.6,
        itemCount: 3,
        cancellable: true,
      });
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('deve marcar pedidos entregues como não canceláveis', async () => {
      prisma.order.count.mockResolvedValue(1);
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'order-2',
          orderNumber: 'EH-20260102-DEF456',
          status: 'DELIVERED',
          paymentStatus: 'APPROVED',
          total: decimal('10.00'),
          createdAt: new Date('2026-01-02T10:00:00Z'),
          items: [{ quantity: 1 }],
        },
      ]);

      const result = await service.findAllByUser('user-1');

      expect(result.orders[0].cancellable).toBe(false);
    });

    it('deve limitar o limite máximo de itens por página em 100', async () => {
      await service.findAllByUser('user-1', 2, 500);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, skip: 100 }),
      );
    });
  });

  describe('findByIdForUser', () => {
    it('deve retornar detalhes do pedido com snapshot e pagamento mais recente', async () => {
      prisma.order.findFirst.mockResolvedValue(buildOrderRecord());

      const result = await service.findByIdForUser('user-1', 'order-1');

      expect(result.orderNumber).toBe('EH-20260101-ABC123');
      expect(result.total).toBe(33.6);
      expect(result.items[0]).toMatchObject({
        name: 'Alface Crespa',
        sku: 'ALF-001',
        unitPrice: 9.9,
      });
      expect(result.payment?.status).toBe('PENDING');
      expect(result.paymentAttempts).toBe(1);
      expect(result.cancellable).toBe(true);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1', userId: 'user-1' } }),
      );
    });

    it('deve lançar NotFound quando pedido pertence a outro usuário', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.findByIdForUser('user-2', 'order-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cancelForUser', () => {
    beforeEach(() => {
      // Consulta pós-transação usada por findByIdForUser.
      prisma.order.findFirst.mockResolvedValue(
        buildOrderRecord({ status: 'CANCELLED' }),
      );
    });

    it('deve cancelar pedido pendente liberando reservas e pagamentos', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'PENDING_PAYMENT', payment_status: 'PENDING' },
      ]);
      prisma.orderItem.findMany.mockResolvedValue([
        {
          productId: 'product-1',
          productNameSnapshot: 'Alface Crespa',
          skuSnapshot: 'ALF-001',
          quantity: 2,
        },
      ]);

      const result = await service.cancelForUser('user-1', 'order-1', {
        reason: 'Desisti da compra',
      });

      expect(inventoryService.releaseReservations).toHaveBeenCalledWith(
        expect.anything(),
        [
          {
            productId: 'product-1',
            name: 'Alface Crespa',
            sku: 'ALF-001',
            quantity: 2,
          },
        ],
      );
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1', status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'Desisti da compra',
        }),
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('não deve liberar estoque quando pagamento já foi aprovado (fluxo administrativo)', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'PAYMENT_APPROVED', payment_status: 'APPROVED' },
      ]);

      await expect(
        service.cancelForUser('user-1', 'order-1', {}),
      ).rejects.toMatchObject({ response: { code: 'ORDER_NOT_CANCELLABLE' } });

      expect(inventoryService.releaseReservations).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('deve rejeitar cancelamento duplicado', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'CANCELLED', payment_status: 'PENDING' },
      ]);

      await expect(service.cancelForUser('user-1', 'order-1', {})).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('deve lançar NotFound quando pedido pertence a outro usuário', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.cancelForUser('user-2', 'order-1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('repeatOrderForUser', () => {
    it('deve adicionar itens ao carrinho respeitando estoque atual', async () => {
      prisma.order.findFirst.mockResolvedValue(buildOrderRecord());
      prisma.product.findUnique.mockImplementation(async ({ where }) =>
        where.id === 'product-1'
          ? {
              id: 'product-1',
              name: 'Alface Crespa',
              isActive: true,
              price: decimal('10.50'),
              inventory: { quantity: 50, reservedQuantity: 5 },
            }
          : {
              id: 'product-2',
              name: 'Rúcula',
              isActive: true,
              price: decimal('4.20'),
              inventory: { quantity: 10, reservedQuantity: 0 },
            },
      );

      const result = await service.repeatOrderForUser('user-1', 'order-1');

      expect(result.addedItems).toEqual([
        { productId: 'product-1', name: 'Alface Crespa', quantity: 2 },
        { productId: 'product-2', name: 'Rúcula', quantity: 1 },
      ]);
      expect(result.skippedItems).toEqual([]);
      expect(prisma.cartItem.create).toHaveBeenCalledTimes(2);
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-1',
          productId: 'product-1',
          quantity: 2,
          unitPrice: decimal('10.50'),
        },
      });
      expect(result.cart).toEqual(emptyCartResponse);
    });

    it('deve somar quantidade ao item já existente no carrinho', async () => {
      prisma.order.findFirst.mockResolvedValue(
        buildOrderRecord({
          items: [
            buildOrderRecord().items[0],
          ],
        }),
      );
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        name: 'Alface Crespa',
        isActive: true,
        price: decimal('10.50'),
        inventory: { quantity: 50, reservedQuantity: 5 },
      });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'cart-item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 3,
      });

      const result = await service.repeatOrderForUser('user-1', 'order-1');

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'cart-item-1' },
        data: { quantity: 5, unitPrice: decimal('10.50') },
      });
      expect(result.addedItems).toEqual([
        { productId: 'product-1', name: 'Alface Crespa', quantity: 2 },
      ]);
    });

    it('deve pular produto indisponível mantendo os demais itens', async () => {
      prisma.order.findFirst.mockResolvedValue(buildOrderRecord());
      prisma.product.findUnique.mockImplementation(async ({ where }) =>
        where.id === 'product-1'
          ? null
          : {
              id: 'product-2',
              name: 'Rúcula',
              isActive: true,
              price: decimal('4.20'),
              inventory: { quantity: 10, reservedQuantity: 0 },
            },
      );

      const result = await service.repeatOrderForUser('user-1', 'order-1');

      expect(result.addedItems).toEqual([
        { productId: 'product-2', name: 'Rúcula', quantity: 1 },
      ]);
      expect(result.skippedItems).toEqual([
        {
          productId: 'product-1',
          name: 'Alface Crespa',
          reason: 'PRODUCT_UNAVAILABLE',
        },
      ]);
      expect(prisma.cartItem.create).toHaveBeenCalledTimes(1);
    });

    it('deve limitar a quantidade ao estoque disponível', async () => {
      prisma.order.findFirst.mockResolvedValue(
        buildOrderRecord({
          items: [buildOrderRecord().items[0]],
        }),
      );
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        name: 'Alface Crespa',
        isActive: true,
        price: decimal('10.50'),
        inventory: { quantity: 5, reservedQuantity: 4 },
      });

      const result = await service.repeatOrderForUser('user-1', 'order-1');

      expect(result.skippedItems).toEqual([]);
      expect(result.addedItems).toEqual([
        { productId: 'product-1', name: 'Alface Crespa', quantity: 1 },
      ]);
    });

    it('deve rejeitar quando nenhum item tem espaço no carrinho', async () => {
      prisma.order.findFirst.mockResolvedValue(
        buildOrderRecord({
          items: [buildOrderRecord().items[0]],
        }),
      );
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        name: 'Alface Crespa',
        isActive: true,
        price: decimal('10.50'),
        inventory: { quantity: 5, reservedQuantity: 0 },
      });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'cart-item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 5,
      });

      await expect(service.repeatOrderForUser('user-1', 'order-1')).rejects.toMatchObject({
        response: {
          code: 'REPEAT_ORDER_NO_ITEMS',
          details: [
            { field: 'items', message: 'Alface Crespa sem estoque disponível' },
          ],
        },
      });
    });

    it('deve rejeitar com REPEAT_ORDER_NO_ITEMS quando nenhum item é adicionado', async () => {
      prisma.order.findFirst.mockResolvedValue(
        buildOrderRecord({
          items: [buildOrderRecord().items[0]],
        }),
      );
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        name: 'Alface Crespa',
        isActive: false,
        price: decimal('10.50'),
        inventory: { quantity: 5, reservedQuantity: 0 },
      });

      await expect(service.repeatOrderForUser('user-1', 'order-1')).rejects.toMatchObject({
        response: {
          code: 'REPEAT_ORDER_NO_ITEMS',
          details: [{ field: 'items', message: 'Alface Crespa indisponível' }],
        },
      });

      expect(cartService.getCart).not.toHaveBeenCalled();
    });

    it('deve lançar NotFound quando pedido pertence a outro usuário', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.repeatOrderForUser('user-2', 'order-1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(cartService.resolveActiveCart).not.toHaveBeenCalled();
    });
  });

  describe('updateStatusForAdmin', () => {
    const adminId = 'admin-1';

    beforeEach(() => {
      // Detalhe retornado após a transação (findByIdForAdmin).
      prisma.order.findUnique.mockResolvedValue(
        buildOrderRecord({ status: 'PREPARING' }),
      );
    });

    it('deve aplicar transição válida sincronizando entrega e audit log', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'PAYMENT_APPROVED', payment_status: 'APPROVED' },
      ]);

      const result = await service.updateStatusForAdmin(adminId, 'order-1', {
        status: 'PREPARING',
        reason: 'Separando itens',
      });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PREPARING' },
      });
      expect(prisma.shipping.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'PROCESSING' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: adminId,
          action: 'ORDER_STATUS_UPDATED',
          entityId: 'order-1',
          metadata: { from: 'PAYMENT_APPROVED', to: 'PREPARING', reason: 'Separando itens' },
        }),
      });
      // Pagamento aprovado: nada reservado para liberar.
      expect(inventoryService.releaseReservations).not.toHaveBeenCalled();
      expect(result.status).toBe('PREPARING');
    });

    it('deve liberar reservas ao cancelar pedido não pago', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'PENDING_PAYMENT', payment_status: 'PENDING' },
      ]);
      prisma.orderItem.findMany.mockResolvedValue([
        {
          productId: 'product-1',
          productNameSnapshot: 'Alface Crespa',
          skuSnapshot: 'ALF-001',
          quantity: 2,
        },
      ]);

      await service.updateStatusForAdmin(adminId, 'order-1', { status: 'CANCELLED' });

      expect(inventoryService.releaseReservations).toHaveBeenCalledWith(
        expect.anything(),
        [
          {
            productId: 'product-1',
            name: 'Alface Crespa',
            sku: 'ALF-001',
            quantity: 2,
          },
        ],
      );
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1', status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: 'CANCELLED', cancelledAt: expect.any(Date) }),
      });
    });

    it('não deve tocar no estoque ao cancelar pedido já pago', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'PAYMENT_APPROVED', payment_status: 'APPROVED' },
      ]);

      await service.updateStatusForAdmin(adminId, 'order-1', {
        status: 'CANCELLED',
        reason: 'Cliente solicitou',
      });

      expect(inventoryService.releaseReservations).not.toHaveBeenCalled();
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('deve registrar envio na saída para entrega e data de entrega ao finalizar', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'OUT_FOR_DELIVERY', payment_status: 'APPROVED' },
      ]);

      await service.updateStatusForAdmin(adminId, 'order-1', { status: 'DELIVERED' });

      expect(prisma.shipping.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: expect.objectContaining({ status: 'DELIVERED', deliveredAt: expect.any(Date) }),
      });
    });

    it('deve rejeitar transição inválida com as opções permitidas', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'DELIVERED', payment_status: 'APPROVED' },
      ]);

      await expect(
        service.updateStatusForAdmin(adminId, 'order-1', { status: 'PREPARING' }),
      ).rejects.toMatchObject({
        response: {
          code: 'ORDER_INVALID_TRANSITION',
          details: [],
        },
      });

      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando o pedido já está no status informado', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { id: 'order-1', status: 'PREPARING', payment_status: 'APPROVED' },
      ]);

      await expect(
        service.updateStatusForAdmin(adminId, 'order-1', { status: 'PREPARING' }),
      ).rejects.toMatchObject({ response: { code: 'ORDER_SAME_STATUS' } });
    });

    it('deve lançar NotFound para pedido inexistente', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.updateStatusForAdmin(adminId, 'order-1', { status: 'PREPARING' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve expor transições permitidas e cliente no detalhe administrativo', async () => {
      prisma.order.findUnique.mockResolvedValue(
        buildOrderRecord({
          status: 'PENDING_PAYMENT',
          user: { id: 'user-1', name: 'Maria', email: 'maria@example.com' },
        }),
      );

      const result = await service.findByIdForAdmin('order-1');

      expect(result.allowedTransitions).toEqual(['PAYMENT_APPROVED', 'CANCELLED']);
      expect(result.customer).toEqual({
        id: 'user-1',
        name: 'Maria',
        email: 'maria@example.com',
      });
    });
  });
});
