import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService, type CartOwner, type CartResponse } from './cart.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { addItemSchema, updateItemSchema } from './cart.validation';
import type { AddItemDto, UpdateItemDto } from './cart.validation';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { Public } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators';

interface CartRequestContext {
  owner: CartOwner;
  cartToken: string | null;
}

@ApiTags('Cart')
@Public()
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Obter carrinho (usuário autenticado ou anônimo via x-cart-token)' })
  async getCart(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    const context = await this.resolveContext(user, cartToken);
    const result = await this.cartService.getCart(context.owner);
    return { data: result, meta: this.buildMeta(context), error: null };
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adicionar produto ao carrinho' })
  async addItem(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-cart-token') cartToken: string | undefined,
    @Body(new ZodValidationPipe(addItemSchema)) body: AddItemDto,
  ) {
    const context = await this.resolveContext(user, cartToken);
    const result = await this.cartService.addItem(context.owner, body);
    return { data: result, meta: this.buildMeta(context), error: null };
  }

  @Patch('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar quantidade de um item do carrinho' })
  async updateItem(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-cart-token') cartToken: string | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateItemSchema)) body: UpdateItemDto,
  ) {
    const context = await this.resolveContext(user, cartToken);
    const result = await this.cartService.updateItemQuantity(context.owner, id, body);
    return { data: result, meta: this.buildMeta(context), error: null };
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover item do carrinho' })
  async removeItem(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-cart-token') cartToken: string | undefined,
    @Param('id') id: string,
  ) {
    const context = await this.resolveContext(user, cartToken);
    const result = await this.cartService.removeItem(context.owner, id);
    return { data: result, meta: this.buildMeta(context), error: null };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Esvaziar carrinho' })
  async clearCart(
    @CurrentUser() user: { id: string } | null,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    const context = await this.resolveContext(user, cartToken);
    const result = await this.cartService.clearCart(context.owner);
    return { data: result, meta: this.buildMeta(context), error: null };
  }

  /**
   * Resolve o dono do carrinho na ordem: usuário autenticado → token de
   * carrinho anônimo → novo carrinho anônimo (com token emitido na resposta).
   */
  private async resolveContext(
    user: { id: string } | null,
    cartToken?: string,
  ): Promise<CartRequestContext> {
    if (user?.id) {
      return { owner: { kind: 'user', userId: user.id }, cartToken: null };
    }

    if (cartToken) {
      const cartId = await this.cartService.verifyCartToken(cartToken);

      if (cartId) {
        return { owner: { kind: 'anonymous', cartId }, cartToken };
      }
    }

    const cart = await this.cartService.createAnonymousCart();
    const issuedToken = await this.cartService.issueCartToken(cart.id);
    return { owner: { kind: 'anonymous', cartId: cart.id }, cartToken: issuedToken };
  }

  private buildMeta(context: CartRequestContext): Record<string, unknown> {
    return context.cartToken ? { cartToken: context.cartToken } : {};
  }
}

// Reexportado para conveniência de testes/integração.
export type { CartResponse };
