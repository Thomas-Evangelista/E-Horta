import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import type { QuoteDto, ShippingMethodDto } from './shipping.validation';

export interface ShippingOption {
  method: ShippingMethodDto;
  label: string;
  description: string;
  fee: number;
  minEstimatedDays: number;
  maxEstimatedDays: number;
}

export interface ShippingMethodConfig {
  fee: Prisma.Decimal;
  estimatedDays: number;
}

interface ShippingConfig {
  label: string;
  description: string;
  feeEnv: string;
  daysEnv: string;
  defaultFee: number;
  defaultDays: number;
}

const SHIPPING_CONFIG: Record<ShippingMethodDto, ShippingConfig> = {
  STANDARD: {
    label: 'Entrega padrão',
    description: 'Receba em até 2 dias úteis',
    feeEnv: 'SHIPPING_STANDARD_FEE',
    daysEnv: 'SHIPPING_STANDARD_DAYS',
    defaultFee: 9.9,
    defaultDays: 2,
  },
  EXPRESS: {
    label: 'Entrega expressa',
    description: 'Receba ainda hoje',
    feeEnv: 'SHIPPING_EXPRESS_FEE',
    daysEnv: 'SHIPPING_EXPRESS_DAYS',
    defaultFee: 14.9,
    defaultDays: 0,
  },
};

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async quote(userId: string, dto: QuoteDto): Promise<ShippingOption[]> {
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
      select: { id: true },
    });

    if (!address) {
      throw new NotFoundException('Endereço não encontrado');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((item) => item.productId) } },
      select: { id: true, isActive: true },
    });

    for (const item of dto.items) {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product || !product.isActive) {
        throw new BadRequestException({
          code: 'PRODUCT_UNAVAILABLE',
          message: 'Produto não encontrado ou indisponível',
          details: [{ field: 'items', message: `Produto ${item.productId} indisponível` }],
        });
      }
    }

    return this.listOptions();
  }

  listOptions(): ShippingOption[] {
    return (Object.keys(SHIPPING_CONFIG) as ShippingMethodDto[]).map((method) => {
      const config = SHIPPING_CONFIG[method];
      return {
        method,
        label: config.label,
        description: config.description,
        fee: this.getFee(method).toNumber(),
        minEstimatedDays: this.getEstimatedDays(method),
        maxEstimatedDays: this.getEstimatedDays(method),
      };
    });
  }

  getMethodConfig(method: ShippingMethodDto): ShippingMethodConfig {
    return {
      fee: this.getFee(method),
      estimatedDays: this.getEstimatedDays(method),
    };
  }

  private getFee(method: ShippingMethodDto): Prisma.Decimal {
    const config = SHIPPING_CONFIG[method];
    const raw = this.configService.get<number>(config.feeEnv, config.defaultFee);
    return new Prisma.Decimal(Math.round(Number(raw) * 100)).div(100);
  }

  private getEstimatedDays(method: ShippingMethodDto): number {
    const config = SHIPPING_CONFIG[method];
    const raw = this.configService.get<number>(config.daysEnv, config.defaultDays);
    const days = Math.max(0, Math.trunc(Number(raw)));
    return Number.isFinite(days) ? days : config.defaultDays;
  }
}
