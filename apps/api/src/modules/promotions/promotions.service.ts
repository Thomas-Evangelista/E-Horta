import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { Prisma, type PromotionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CartService, type CartOwner, type CartResponse } from '../cart/cart.service';
import { findPromotionIneligibility, getIneligibilityMessage } from '../../common/utils/promotion-calculator';
import type {
  ApplyCouponDto,
  CreatePromotionDto,
  UpdatePromotionDto,
} from './promotions.validation';

export interface AdminPromotionView {
  id: string;
  code: string;
  name: string;
  type: PromotionType;
  value: number;
  minimumOrderValue: number | null;
  maxDiscount: number | null;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  async applyCoupon(owner: CartOwner, dto: ApplyCouponDto): Promise<CartResponse> {
    const cart = await this.cartService.resolveActiveCart(owner);

    const promotion = await this.prisma.promotion.findUnique({
      where: { code: dto.code },
    });

    if (!promotion) {
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: 'Cupom não encontrado',
      });
    }

    const subtotal = await this.cartService.getCartSubtotal(cart.id);
    const ineligibility = findPromotionIneligibility(promotion, subtotal);

    if (ineligibility) {
      throw new BadRequestException({
        code: ineligibility,
        message: getIneligibilityMessage(ineligibility),
      });
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: promotion.id },
    });

    this.logger.log(`Coupon ${promotion.code} applied to cart ${cart.id}`);
    return this.cartService.getCart(owner);
  }

  // ---------------------------------------------------------------------------
  // Administração (Fase 8)
  // ---------------------------------------------------------------------------

  async findAllForAdmin(
    filters: { page?: number; limit?: number; search?: string; isActive?: boolean } = {},
  ): Promise<{
    promotions: AdminPromotionView[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const safeLimit = Math.min(Math.max(1, filters.limit ?? 20), 100);
    const safePage = Math.max(1, filters.page ?? 1);

    const where = {
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.search && {
        OR: [
          { code: { contains: filters.search, mode: 'insensitive' as const } },
          { name: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [total, promotions] = await this.prisma.$transaction([
      this.prisma.promotion.count({ where }),
      this.prisma.promotion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    return {
      promotions: promotions.map((promotion) => this.toAdminView(promotion)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  async findPromotionById(id: string): Promise<AdminPromotionView> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Promoção não encontrada');
    }

    return this.toAdminView(promotion);
  }

  async createPromotion(data: CreatePromotionDto): Promise<AdminPromotionView> {
    await this.assertCodeAvailable(data.code);

    const promotion = await this.prisma.promotion.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        value: data.value,
        minimumOrderValue: data.minimumOrderValue ?? null,
        maxDiscount: data.maxDiscount ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        usageLimit: data.usageLimit ?? null,
        isActive: true,
      },
    });

    this.logger.log(`Promotion created: ${promotion.code} (${promotion.id})`);
    return this.toAdminView(promotion);
  }

  async updatePromotion(id: string, data: UpdatePromotionDto): Promise<AdminPromotionView> {
    const existing = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Promoção não encontrada');
    }

    // Regras cruzadas validadas com o estado resultante (atual + patch).
    const resultType = data.type ?? existing.type;
    const resultValue = data.value !== undefined ? data.value : existing.value.toNumber();
    const resultStartsAt = data.startsAt ?? existing.startsAt;
    const resultEndsAt = data.endsAt ?? existing.endsAt;

    if (resultType === 'PERCENTAGE' && resultValue > 100) {
      throw new BadRequestException({
        code: 'INVALID_PROMOTION',
        message: 'Percentual não pode ser maior que 100',
      });
    }

    if (resultType !== 'PERCENTAGE' && resultValue <= 0 && data.value !== undefined) {
      throw new BadRequestException({
        code: 'INVALID_PROMOTION',
        message: 'Valor deve ser maior que zero',
      });
    }

    if (resultEndsAt <= resultStartsAt) {
      throw new BadRequestException({
        code: 'INVALID_PROMOTION',
        message: 'Data de término deve ser posterior à data de início',
      });
    }

    if (data.code && data.code !== existing.code) {
      await this.assertCodeAvailable(data.code);
    }

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.minimumOrderValue !== undefined && { minimumOrderValue: data.minimumOrderValue }),
        ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount }),
        ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
        ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
        ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    this.logger.log(`Promotion updated: ${updated.code} (${updated.id})`);
    return this.toAdminView(updated);
  }

  /**
   * Exclusão de promoção: bloqueada quando já há usos registrados para
   * preservar o histórico de pedidos. Nesses casos, desativar é o caminho.
   */
  async deletePromotion(id: string): Promise<void> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('Promoção não encontrada');
    }

    if (promotion.usageCount > 0) {
      throw new ConflictException(
        'Não é possível excluir uma promoção que já foi utilizada. Desative-a.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cart.updateMany({ where: { couponId: id }, data: { couponId: null } });
      await tx.promotion.delete({ where: { id } });
    });

    this.logger.log(`Promotion deleted: ${promotion.code} (${promotion.id})`);
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.prisma.promotion.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException('Já existe uma promoção com este código');
    }
  }

  private toAdminView(promotion: {
    id: string;
    code: string;
    name: string;
    type: PromotionType;
    value: Prisma.Decimal;
    minimumOrderValue: Prisma.Decimal | null;
    maxDiscount: Prisma.Decimal | null;
    startsAt: Date;
    endsAt: Date;
    usageLimit: number | null;
    usageCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AdminPromotionView {
    return {
      id: promotion.id,
      code: promotion.code,
      name: promotion.name,
      type: promotion.type,
      value: promotion.value.toNumber(),
      minimumOrderValue: promotion.minimumOrderValue?.toNumber() ?? null,
      maxDiscount: promotion.maxDiscount?.toNumber() ?? null,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      usageLimit: promotion.usageLimit,
      usageCount: promotion.usageCount,
      isActive: promotion.isActive,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
    };
  }

  async removeCoupon(owner: CartOwner): Promise<CartResponse> {
    const cart = await this.cartService.resolveActiveCart(owner);

    if (cart.couponId) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { couponId: null },
      });
    }

    return this.cartService.getCart(owner);
  }
}
