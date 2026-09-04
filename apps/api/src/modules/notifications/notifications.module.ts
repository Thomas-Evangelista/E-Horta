import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { MailerService } from './mailer.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsProcessor, MailerService],
  exports: [NotificationsService, MailerService],
})
export class NotificationsModule {}
