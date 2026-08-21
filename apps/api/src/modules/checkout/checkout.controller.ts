import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { checkoutSchema, type CheckoutDto } from './checkout.validation';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Checkout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Finalizar compra: valida carrinho/estoque/cupom e cria o pedido' })
  async checkout(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(checkoutSchema)) body: CheckoutDto,
  ) {
    const result = await this.checkoutService.checkout(user.id, body);
    return { data: result, meta: {}, error: null };
  }
}
