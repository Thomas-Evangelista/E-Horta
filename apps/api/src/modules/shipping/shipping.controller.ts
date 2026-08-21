import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { quoteSchema, type QuoteDto } from './shipping.validation';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Shipping')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calcular opções de entrega para um endereço e itens' })
  async quote(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(quoteSchema)) body: QuoteDto,
  ) {
    const options = await this.shippingService.quote(user.id, body);
    return { data: { options }, meta: {}, error: null };
  }
}
