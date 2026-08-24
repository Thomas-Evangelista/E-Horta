import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsProcessor } from './notifications.processor';
import { MailerService } from './mailer.service';
import { PrismaService } from '../../database/prisma.service';

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let prisma: {
    notification: { create: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let mailerService: { sendMail: jest.Mock };

  const jobData = {
    userId: 'user-1',
    event: 'PAYMENT_APPROVED' as const,
    data: { orderNumber: 'EH-20260823-ABC123', orderId: 'order-1', total: 33.6 },
  };

  beforeEach(async () => {
    prisma = {
      notification: { create: jest.fn().mockResolvedValue({}) },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'thomas@ehorta.dev' }),
      },
    };
    mailerService = { sendMail: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();

    processor = moduleRef.get(NotificationsProcessor);
  });

  it('deve persistir notificação interna e enviar e-mail do pagamento aprovado', async () => {
    await processor.handle(jobData);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        title: 'Pagamento aprovado',
        message:
          'Pagamento do pedido EH-20260823-ABC123 aprovado! Seu pedido entrará em preparo.',
      },
    });

    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'thomas@ehorta.dev',
        subject: 'Pagamento aprovado - Pedido EH-20260823-ABC123',
      }),
    );
  });

  it('deve descartar notificação de usuário inexistente sem enviar e-mail', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await processor.handle(jobData);

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });

  describe('MailerService (sem SMTP configurado)', () => {
    it('deve registrar e-mail no log em vez de falhar quando SMTP ausente', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          MailerService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
        ],
      }).compile();

      const mailer = moduleRef.get(MailerService);

      await expect(
        mailer.sendMail({ to: 'a@b.c', subject: 'S', html: '<p>H</p>' }),
      ).resolves.toBeUndefined();
    });
  });
});
