import {
  Controller,
  Post,
  Delete,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CartService, type CartOwner } from '../cart/cart.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { applyCouponSchema, type ApplyCouponDto } from './promotions.validation';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { Public, CurrentUser } from '../../common/decorators';

@ApiTags('Promotions')
@Public()
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
@Controller('cart/coupon')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly cartService: CartService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar cupom ao carrinho' })
  async applyCoupon(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-cart-token') cartToken?: string,
    @Body(new ZodValidationPipe(applyCouponSchema)) body?: ApplyCouponDto,
  ) {
    const owner = await this.resolveOwner(user, cartToken);
    const result = await this.promotionsService.applyCoupon(owner, body!);
    return { data: result, meta: {}, error: null };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover cupom do carrinho' })
  async removeCoupon(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    const owner = await this.resolveOwner(user, cartToken);
    const result = await this.promotionsService.removeCoupon(owner);
    return { data: result, meta: {}, error: null };
  }

  private async resolveOwner(
    user: { id: string } | null,
    cartToken?: string,
  ): Promise<CartOwner> {
    if (user?.id) {
      return { kind: 'user', userId: user.id };
    }

    if (cartToken) {
      const cartId = await this.cartService.verifyCartToken(cartToken);

      if (cartId) {
        return { kind: 'anonymous', cartId };
      }
    }

    throw new BadRequestException('Carrinho não identificado. Informe o x-cart-token.');
  }
}
