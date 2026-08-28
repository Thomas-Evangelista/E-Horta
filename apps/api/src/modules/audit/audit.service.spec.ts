import { Test } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: { create: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'log-2',
            userId: 'user-1',
            user: { email: 'cliente@example.com' },
            action: 'PRODUCT_CREATED',
            entity: 'Product',
            entityId: 'product-1',
            metadata: { name: 'Alface' },
            ip: '10.0.0.1',
            userAgent: 'jest',
            createdAt: new Date('2026-08-28T10:00:00Z'),
          },
          {
            id: 'log-1',
            userId: null,
            user: null,
            action: 'STOCK_CHANGED',
            entity: 'Inventory',
            entityId: 'product-1',
            metadata: {},
            ip: null,
            userAgent: null,
            createdAt: new Date('2026-08-28T09:00:00Z'),
          },
        ]),
      },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
    };

    tx = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-tx' }) } };

    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AuditService);
  });

  describe('record', () => {
    it('deve gravar no repositório padrão com contexto do request', async () => {
      await service.record({
        userId: 'admin-1',
        action: 'PRICE_CHANGED',
        entity: 'Product',
        entityId: 'product-1',
        metadata: { from: 1, to: 2 },
        ip: '200.150.10.5',
        userAgent: 'Mozilla/5.0',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-1',
          action: 'PRICE_CHANGED',
          entity: 'Product',
          entityId: 'product-1',
          metadata: { from: 1, to: 2 },
          ip: '200.150.10.5',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('deve participar da transação informada via db', async () => {
      await service.record({
        action: 'USER_BLOCKED',
        entity: 'User',
        entityId: 'user-1',
        db: tx as never,
      });

      expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('deve padronizar campos ausentes (null/vazio)', async () => {
      await service.record({
        action: 'USER_CREATED',
        entity: 'User',
        entityId: 'user-1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          ip: null,
          userAgent: null,
          metadata: {},
        }),
      });
    });
  });

  describe('findAll', () => {
    it('deve listar com paginação e incluir o e-mail do usuário', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
      expect(result.items[0].userEmail).toBe('cliente@example.com');
      expect(result.items[1].userEmail).toBeNull();
    });

    it('deve filtrar por ação quando informada', async () => {
      await service.findAll({ action: 'PRODUCT_CREATED' });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { action: 'PRODUCT_CREATED' },
      });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { action: 'PRODUCT_CREATED' } }),
      );
    });

    it('deve limitar o limit na faixa segura (máx. 100)', async () => {
      await service.findAll({ page: 2, limit: 999 });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 100, take: 100 }),
      );
    });
  });
});
