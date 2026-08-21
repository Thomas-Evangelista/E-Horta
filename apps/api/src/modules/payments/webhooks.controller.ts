import { Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators';
import { PaymentsService } from './payments.service';
import type { WebhookProcessResult } from './payments.service';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Endpoint público para gateways de pagamento. A autenticação é feita
   * pela assinatura HMAC-SHA256 do raw body (header x-webhook-signature).
   * Eventos válidos — inclusive duplicados — sempre recebem 200,
   * evitando retries desnecessários do gateway.
   */
  @Public()
  @Post('payments')
  @ApiOperation({ summary: 'Recebe notificações de pagamento do gateway' })
  async handlePaymentWebhook(@Req() request: RequestWithRawBody): Promise<{
    data: WebhookProcessResult;
    meta: Record<string, never>;
    error: null;
  }> {
    const rawBody = request.rawBody ?? Buffer.from('');

    const result = await this.paymentsService.processWebhook(
      rawBody,
      request.headers['x-webhook-signature'] as string | undefined,
    );

    return { data: result, meta: {}, error: null };
  }
}
