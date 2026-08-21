import { Body, Controller, Get, Param, Post, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  PaymentsService,
  type OrderPaymentView,
  type WebhookProcessResult,
} from './payments.service';

const simulateEventSchema = z.object({
  outcome: z.enum(['approved', 'failed']),
});

type SimulateEventDto = z.infer<typeof simulateEventSchema>;

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Consulta o pagamento mais recente de um pedido' })
  async getByOrder(
    @CurrentUser() user: { id: string },
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<{ data: OrderPaymentView; meta: Record<string, never>; error: null }> {
    const data = await this.paymentsService.getByOrderForUser(user.id, orderId);
    return { data, meta: {}, error: null };
  }

  @Post('order/:orderId/retry')
  @ApiOperation({ summary: 'Cria nova tentativa de pagamento para pedido pendente' })
  async retry(
    @CurrentUser() user: { id: string },
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<{ data: OrderPaymentView; meta: Record<string, never>; error: null }> {
    const data = await this.paymentsService.retryPayment(user.id, orderId);
    return { data, meta: {}, error: null };
  }

  /**
   * EXCLUSIVO SANDBOX/DESENVOLVIMENTO: simula a notificação que um gateway
   * real enviaria. Passa exatamente pelo mesmo pipeline de webhook assinado.
   * Bloqueado em produção (retorna 404).
   */
  @Post('sandbox/:paymentId/simulate')
  @ApiOperation({ summary: '[Sandbox] Simula webhook do gateway (aprovado/recusado)' })
  async simulate(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body(new ZodValidationPipe(simulateEventSchema)) dto: SimulateEventDto,
  ): Promise<{ data: WebhookProcessResult; meta: Record<string, never>; error: null }> {
    const data = await this.paymentsService.simulateGatewayEvent(paymentId, dto.outcome);
    return { data, meta: {}, error: null };
  }
}
