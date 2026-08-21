import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CartService, type CartOwner, type CartResponse } from '../cart/cart.service';
import { findPromotionIneligibility, getIneligibilityMessage } from '../../common/utils/promotion-calculator';
import type { ApplyCouponDto } from './promotions.validation';

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
