import { Test } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    order: { count: jest.Mock };
    payment: { aggregate: jest.Mock };
    inventory: { findMany: jest.Mock };
    product: { count: jest.Mock };
    user: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      order: { count: jest.fn().mockResolvedValue(0) },
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: new Prisma.Decimal('150.00') } }),
      },
      inventory: {
        findMany: jest.fn().mockResolvedValue([
          { quantity: 10, reservedQuantity: 2, minimumStock: 5 },
          { quantity: 4, reservedQuantity: 1, minimumStock: 5 },
          { quantity: 20, reservedQuantity: 18, minimumStock: 5 },
        ]),
      },
      product: { count: jest.fn().mockResolvedValue(42) },
      user: { count: jest.fn().mockResolvedValue(7) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  it('deve agregar os indicadores do painel', async () => {
    const dashboard = await service.getDashboard();

    expect(dashboard).toEqual({
      ordersToday: 0,
      salesToday: 150,
      pendingOrders: 0,
      lowStockProducts: 2,
      activeProducts: 42,
      customers: 7,
    });
  });

  it('deve considerar apenas pagamentos aprovados hoje nas vendas', async () => {
    await service.getDashboard();

    expect(prisma.payment.aggregate).toHaveBeenCalledWith({
      _sum: { amount: true },
      where: expect.objectContaining({ status: 'APPROVED' }),
    });
  });

  it('deve retornar zero em vendas quando não há pagamentos no dia', async () => {
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const dashboard = await service.getDashboard();

    expect(dashboard.salesToday).toBe(0);
  });
});
