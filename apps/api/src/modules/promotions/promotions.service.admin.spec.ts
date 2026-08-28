import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const decimal = (value: string) => new Prisma.Decimal(value);

const promotionRecord = {
  id: 'promotion-1',
  code: 'VERAO10',
  name: 'Desconto de Verão',
  type: 'PERCENTAGE' as const,
  value: decimal('10'),
  minimumOrderValue: decimal('50'),
  maxDiscount: decimal('20'),
  startsAt: new Date('2026-01-01T00:00:00Z'),
  endsAt: new Date('2026-12-31T23:59:59Z'),
  usageLimit: 100,
  usageCount: 0,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('PromotionsService — administração', () => {
  let service: PromotionsService;
  let prisma: {
    promotion: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cart: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let cartService: { resolveActiveCart: jest.Mock };
  let audit: { record: jest.Mock };

  const createDto = {
    code: 'BAIXA20',
    name: 'Cupom Baixa Estoque',
    type: 'FIXED' as const,
    value: 5,
    startsAt: new Date('2026-08-01T00:00:00Z'),
    endsAt: new Date('2026-09-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      promotion: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(promotionRecord),
        update: jest.fn().mockResolvedValue(promotionRecord),
        delete: jest.fn().mockResolvedValue({}),
      },
      cart: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };

    cartService = {
      resolveActiveCart: jest.fn(),
    };

    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: cartService },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(PromotionsService);
  });

  describe('createPromotion', () => {
    it('deve criar promoção com código disponível', async () => {
      prisma.promotion.findUnique.mockResolvedValue(null);
      prisma.promotion.create.mockResolvedValue({
        ...promotionRecord,
        code: 'BAIXA20',
        type: 'FIXED',
        value: decimal('5'),
      });

      const result = await service.createPromotion(createDto);

      expect(result.code).toBe('BAIXA20');
      expect(result.value).toBe(5);
      expect(prisma.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'BAIXA20', type: 'FIXED', value: 5 }),
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROMOTION_CREATED',
          entity: 'Promotion',
          metadata: expect.objectContaining({ code: 'BAIXA20', type: 'FIXED' }),
        }),
      );
    });

    it('deve rejeitar código duplicado', async () => {
      prisma.promotion.findUnique.mockResolvedValue(promotionRecord);

      await expect(service.createPromotion(createDto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updatePromotion', () => {
    it('deve desativar promoção', async () => {
      prisma.promotion.findUnique.mockResolvedValue(promotionRecord);
      prisma.promotion.update.mockResolvedValue({ ...promotionRecord, isActive: false });

      const result = await service.updatePromotion('promotion-1', { isActive: false });

      expect(prisma.promotion.update).toHaveBeenCalledWith({
        where: { id: 'promotion-1' },
        data: { isActive: false },
      });
      expect(result).toBeDefined();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROMOTION_UPDATED',
          metadata: expect.objectContaining({
            from: expect.objectContaining({ isActive: true }),
            to: expect.objectContaining({ isActive: false }),
          }),
        }),
      );
    });

    it('deve rejeitar percentual acima de 100 considerando o tipo atual', async () => {
      prisma.promotion.findUnique.mockResolvedValue(promotionRecord);

      await expect(service.updatePromotion('promotion-1', { value: 120 })).rejects.toMatchObject({
        response: { code: 'INVALID_PROMOTION' },
      });

      expect(prisma.promotion.update).not.toHaveBeenCalled();
    });

    it('deve rejeitar período inválido', async () => {
      prisma.promotion.findUnique.mockResolvedValue({
        ...promotionRecord,
        endsAt: new Date('2026-06-30T00:00:00Z'),
      });

      await expect(
        service.updatePromotion('promotion-1', { startsAt: new Date('2026-07-01T00:00:00Z') }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_PROMOTION' } });
    });

    it('deve lançar NotFound quando promoção não existe', async () => {
      prisma.promotion.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePromotion('promotion-x', { isActive: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deletePromotion', () => {
    it('deve excluir promoção nunca utilizada e limpar carrinhos', async () => {
      prisma.promotion.findUnique.mockResolvedValue(promotionRecord);

      await service.deletePromotion('promotion-1');

      expect(prisma.cart.updateMany).toHaveBeenCalledWith({
        where: { couponId: 'promotion-1' },
        data: { couponId: null },
      });
      expect(prisma.promotion.delete).toHaveBeenCalledWith({
        where: { id: 'promotion-1' },
      });
    });

    it('deve bloquear exclusão de promoção já utilizada', async () => {
      prisma.promotion.findUnique.mockResolvedValue({
        ...promotionRecord,
        usageCount: 3,
      });

      await expect(service.deletePromotion('promotion-1')).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prisma.promotion.delete).not.toHaveBeenCalled();
    });
  });
});
