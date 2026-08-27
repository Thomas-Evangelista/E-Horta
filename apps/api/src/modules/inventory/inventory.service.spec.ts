import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService, type StockOperationItem } from './inventory.service';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '@prisma/client';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    inventory: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    $executeRaw: jest.Mock;
  };
  let tx: Prisma.TransactionClient;

  const productId = 'aa000000-0000-4000-8000-000000000001';
  const inventoryRow = {
    id: 'inv-1',
    productId,
    quantity: 10,
    reservedQuantity: 2,
    minimumStock: 3,
    updatedAt: new Date(),
  };

  const item: StockOperationItem = {
    productId,
    name: 'Tomate',
    sku: 'TOM-001',
    quantity: 2,
  };

  beforeEach(async () => {
    prisma = {
      inventory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(InventoryService);
    tx = prisma as unknown as Prisma.TransactionClient;
  });

  describe('findByProductId', () => {
    it('deve retornar o estoque do produto', async () => {
      prisma.inventory.findUnique.mockResolvedValue(inventoryRow);

      await expect(service.findByProductId(productId)).resolves.toEqual(inventoryRow);
    });

    it('deve lançar NotFound quando não existe', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(service.findByProductId(productId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('deve listar estoque incluindo produto e ordenado por atualização', async () => {
      prisma.inventory.findMany.mockResolvedValue([inventoryRow]);

      await service.findAll();

      expect(prisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ product: expect.any(Object) }),
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });
  });

  describe('findLowStock', () => {
    it('deve retornar apenas itens com saldo disponível <= mínimo', async () => {
      const below = { ...inventoryRow, quantity: 5, reservedQuantity: 2, minimumStock: 3 };
      const ok = { ...inventoryRow, quantity: 50, minimumStock: 3, reservedQuantity: 0 };
      prisma.inventory.findMany.mockResolvedValue([below, ok]);

      const result = await service.findLowStock();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(below);
    });
  });

  describe('updateStock', () => {
    it('deve atualizar quantidade e mínimo', async () => {
      prisma.inventory.findUnique.mockResolvedValue(inventoryRow);
      prisma.inventory.update.mockResolvedValue({ ...inventoryRow, quantity: 20 });

      await service.updateStock(productId, { quantity: 20, minimumStock: 5 });

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { productId },
        data: { quantity: 20, minimumStock: 5 },
      });
    });

    it('deve rejeitar quantidade negativa', async () => {
      prisma.inventory.findUnique.mockResolvedValue(inventoryRow);

      await expect(service.updateStock(productId, { quantity: -1 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.inventory.update).not.toHaveBeenCalled();
    });

    it('deve lançar NotFound para produto sem estoque', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(service.updateStock(productId, { quantity: 1 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('reserveItems — prevenção de overselling', () => {
    it('deve reservar estoque quando há saldo suficiente', async () => {
      await service.reserveItems(tx, [item]);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(String(prisma.$executeRaw.mock.calls[0][0])).toContain(
        'reserved_quantity" = "reserved_quantity" + ',
      );
    });

    it('deve lançar OUT_OF_STOCK quando o UPDATE condicional não afeta nenhuma linha', async () => {
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(service.reserveItems(tx, [item])).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deve interromper no primeiro item sem estoque', async () => {
      prisma.$executeRaw
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);

      await expect(
        service.reserveItems(tx, [item, { ...item, productId: 'bb000000-0000-4000-8000-000000000002' }]),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('releaseReservations', () => {
    it('deve liberar reservas sem permitir negativo (GREATEST(0, ...))', async () => {
      await service.releaseReservations(tx, [item]);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(String(prisma.$executeRaw.mock.calls[0][0])).toContain('GREATEST(0');
    });
  });

  describe('confirmReductions — baixa definitiva', () => {
    it('deve converter reserva em baixa de estoque', async () => {
      await service.confirmReductions(tx, [item]);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(String(prisma.$executeRaw.mock.calls[0][0])).toContain(
        '"quantity" = "quantity" - ',
      );
    });

    it('deve ignorar (sem lançar) quando a reserva não é encontrada', async () => {
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(service.confirmReductions(tx, [item])).resolves.toBeUndefined();
    });
  });
});
