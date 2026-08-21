import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../../database/prisma.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: {
    address: { findFirst: jest.Mock };
    product: { findMany: jest.Mock };
  };
  let configValues: Record<string, number | undefined>;

  beforeEach(async () => {
    prisma = {
      address: { findFirst: jest.fn() },
      product: { findMany: jest.fn() },
    };

    configValues = {};

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => configValues[key] ?? defaultValue,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ShippingService);
  });

  describe('listOptions', () => {
    it('deve retornar opções padrão com valores da spec (9.90 e 14.90)', () => {
      const options = service.listOptions();

      expect(options).toHaveLength(2);

      const standard = options.find((option) => option.method === 'STANDARD');
      const express = options.find((option) => option.method === 'EXPRESS');

      expect(standard).toMatchObject({ fee: 9.9, maxEstimatedDays: 2 });
      expect(express).toMatchObject({ fee: 14.9, maxEstimatedDays: 0 });
    });

    it('deve respeitar valores configurados via ambiente', () => {
      configValues.SHIPPING_STANDARD_FEE = 12.345;
      configValues.SHIPPING_EXPRESS_DAYS = 1;

      const options = service.listOptions();

      // Arredonda para centavos
      expect(options.find((option) => option.method === 'STANDARD')?.fee).toBe(12.35);
      expect(options.find((option) => option.method === 'EXPRESS')?.maxEstimatedDays).toBe(1);
    });
  });

  describe('quote', () => {
    const dto = {
      addressId: '0b8f6c1a-1111-4222-8333-444455556666',
      items: [{ productId: 'aa000000-0000-4000-8000-000000000001', quantity: 2 }],
    };

    it('deve retornar opções quando endereço e produtos são válidos', async () => {
      prisma.address.findFirst.mockResolvedValue({ id: dto.addressId });
      prisma.product.findMany.mockResolvedValue([
        { id: dto.items[0].productId, isActive: true },
      ]);

      const options = await service.quote('user-1', dto);

      expect(options).toHaveLength(2);
      expect(prisma.address.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('deve lançar NotFoundException quando endereço não pertence ao usuário', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(service.quote('user-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar erro quando produto está inativo', async () => {
      prisma.address.findFirst.mockResolvedValue({ id: dto.addressId });
      prisma.product.findMany.mockResolvedValue([]);

      await expect(service.quote('user-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMethodConfig', () => {
    it('deve retornar Decimal e dias estimados do método', () => {
      const config = service.getMethodConfig('STANDARD');

      expect(config.fee.toNumber()).toBe(9.9);
      expect(config.estimatedDays).toBe(2);
    });
  });
});
