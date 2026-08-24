import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from './mailer.service';
import { renderEmailHtml, renderTemplate, type NotificationJobData } from './notification-events';

/**
 * Processa jobs da fila de notificações (spec #16):
 * persiste a notificação interna e dispara o e-mail do usuário.
 * Erros são logados — notificação nunca derruba o fluxo de negócio.
 */
@Injectable()
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  async handle(data: NotificationJobData): Promise<void> {
    const template = renderTemplate(data.event, data.data);

    await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: template.title,
        message: template.message,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    if (!user) {
      this.logger.warn(`Notificação para usuário inexistente ${data.userId} descartada`);
      return;
    }

    await this.mailerService.sendMail({
      to: user.email,
      subject: template.emailSubject,
      html: renderEmailHtml(data.event, data.data),
    });

    this.logger.log(`Notificação "${data.event}" processada para usuário ${data.userId}`);
  }
}
