import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { SandboxPixProvider } from './providers/sandbox-pix.provider';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { PaymentsService } from './payments.service';

const paymentProviderFactory: Provider = {
  provide: PAYMENT_PROVIDER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const provider = configService.get<string>('PAYMENT_PROVIDER', 'sandbox');

    switch (provider) {
      case 'sandbox':
        return new SandboxPixProvider();
      default:
        throw new Error(
          `PAYMENT_PROVIDER "${provider}" não suportado. Configure "sandbox" ou implemente um adapter para o gateway desejado.`,
        );
    }
  },
};

@Module({
  imports: [InventoryModule, NotificationsModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [paymentProviderFactory, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
