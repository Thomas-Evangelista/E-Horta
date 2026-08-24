import { Test } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../database/prisma.service';

const buildReviewRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'review-1',
  userId: 'user-1',
  productId: 'product-1',
  orderId: 'order-1',
  rating: 5,
  comment: 'Alface muito fresca!',
  status: 'PENDING' as const,
  createdAt: new Date('2026-08-23T10:00:00Z'),
  updatedAt: new Date('2026-08-23T10:00:00Z'),
  user: { id: 'user-1', name: 'Thomas' },
  product: { id: 'product-1', name: 'Alface Crespa', slug: 'alface-crespa' },
  ...overrides,
});

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    product: { findUnique: jest.Mock };
    orderItem: { findFirst: jest.Mock };
    review: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
      groupBy: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn() },
      orderItem: { findFirst: jest.fn() },
      review: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ReviewsService);

    // Transação em array: executa cada promise do array.
    prisma.$transaction.mockImplementation(async (input) =>
      Array.isArray(input) ? Promise.all(input) : (input as (tx: unknown) => Promise<unknown>)(prisma),
    );
  });

  describe('createForUser', () => {
    const dto = { rating: 4, comment: 'Muito fresca' };

    it('deve criar avaliação pendente vinculada ao pedido da compra', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1', isActive: true });
      prisma.orderItem.findFirst.mockResolvedValue({ orderId: 'order-1' });
      prisma.review.create.mockResolvedValue(buildReviewRecord({ rating: 4 }));

      const result = await service.createForUser('user-1', 'product-1', dto);

      expect(result.status).toBe('PENDING');
      expect(result.rating).toBe(4);
      expect(prisma.orderItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-1',
            order: expect.objectContaining({ userId: 'user-1' }),
          }),
        }),
      );
    });

    it('deve bloquear avaliação de quem nunca comprou o produto', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1', isActive: true });
      prisma.orderItem.findFirst.mockResolvedValue(null);

      await expect(service.createForUser('user-1', 'product-1', dto)).rejects.toMatchObject({
        response: { code: 'REVIEW_PURCHASE_REQUIRED' },
      });
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('deve bloquear produto inexistente ou inativo com 404', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createForUser('user-1', 'product-1', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve impedir segunda avaliação do mesmo produto pelo usuário (409)', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1', isActive: true });
      prisma.orderItem.findFirst.mockResolvedValue({ orderId: 'order-1' });

      const p2002 = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.review.create.mockRejectedValue(p2002);

      await expect(
        service.createForUser('user-1', 'product-1', dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findForProduct', () => {
    it('deve listar apenas aprovadas com resumo e distribuição', async () => {
      prisma.review.count.mockResolvedValue(2);
      prisma.review.findMany.mockResolvedValue([
        buildReviewRecord({ status: 'APPROVED' }),
        buildReviewRecord({ id: 'review-2', rating: 3, status: 'APPROVED' }),
      ]);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4 },
        _count: 2,
      });
      prisma.review.groupBy.mockResolvedValue([
        { rating: 5, _count: 1 },
        { rating: 3, _count: 1 },
      ]);

      const result = await service.findForProduct('product-1');

      expect(result.summary.total).toBe(2);
      expect(result.summary.average).toBe(4);
      expect(result.summary.distribution[5]).toBe(1);
      expect(result.summary.distribution[3]).toBe(1);
      expect(result.summary.distribution[1]).toBe(0);
      expect(result.reviews.every((review) => review.user.name.length > 0)).toBe(true);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });
  });

  describe('removeForOwner', () => {
    it('deve remover avaliação do próprio autor', async () => {
      prisma.review.findUnique.mockResolvedValue(buildReviewRecord());

      await expect(service.removeForOwner('user-1', 'review-1')).resolves.toBeUndefined();
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'review-1' } });
    });

    it('não deve revelar existência de avaliação alheia (404)', async () => {
      prisma.review.findUnique.mockResolvedValue(buildReviewRecord({ userId: 'other-user' }));

      await expect(
        service.removeForOwner('user-1', 'review-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.review.delete).not.toHaveBeenCalled();
    });
  });

  describe('moderate', () => {
    it('deve aprovar avaliação e registrar auditoria', async () => {
      prisma.review.findUnique.mockResolvedValue(buildReviewRecord());
      prisma.review.update.mockResolvedValue(
        buildReviewRecord({ status: 'APPROVED' }),
      );

      const result = await service.moderate('admin-1', 'review-1', 'APPROVED');

      expect(result.status).toBe('APPROVED');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-1',
          action: 'REVIEW_MODERATED',
          entityId: 'review-1',
        }),
      });
    });

    it('deve rejeitar transição para o mesmo status (400)', async () => {
      prisma.review.findUnique.mockResolvedValue(
        buildReviewRecord({ status: 'APPROVED' }),
      );

      await expect(
        service.moderate('admin-1', 'review-1', 'APPROVED'),
      ).rejects.toMatchObject({ response: { code: 'REVIEW_SAME_STATUS' } });
    });
  });
});
