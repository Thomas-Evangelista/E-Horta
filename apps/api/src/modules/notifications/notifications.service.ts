import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsProcessor } from './notifications.processor';
import type { NotificationEvent, NotificationJobData, NotificationEventData } from './notification-events';

export const NOTIFICATIONS_QUEUE_NAME = 'notifications';

export interface NotificationSummary {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Fachada de notificações (spec #16): enfileira via BullMQ (Redis) e
 * processa em worker. Se o Redis estiver indisponível no momento do
 * enqueue, cai para processamento inline — o fluxo de negócio segue.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private queue: Queue<NotificationJobData> | null = null;
  private worker: Worker<NotificationJobData> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly processor: NotificationsProcessor,
  ) {}

  onModuleInit(): void {
    try {
      const connection = this.buildConnection();
      // Queue e Worker conectam de forma preguiçosa; falhas de conexão
      // não derrubam a aplicação (notify() faz fallback inline).
      this.queue = new Queue<NotificationJobData>(NOTIFICATIONS_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });
      this.worker = new Worker<NotificationJobData>(
        NOTIFICATIONS_QUEUE_NAME,
        async (job) => this.processor.handle(job.data),
        { connection, concurrency: 5 },
      );
      this.worker.on('failed', (job, error) => {
        this.logger.error(
          `Job de notificação ${job?.id ?? '?'} falhou: ${error.message}`,
        );
      });
    } catch (error) {
      this.logger.error(
        `Fila de notificações indisponível (${error instanceof Error ? error.message : error}); usando processamento inline`,
      );
      this.queue = null;
      this.worker = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close()?.catch(() => undefined);
    await this.queue?.close()?.catch(() => undefined);
  }

  /**
   * Ponto de entrada para os demais módulos. Nunca lança.
   * Ex.: notifications.notify(user.id, 'ORDER_CREATED', { orderNumber });
   */
  notify(userId: string, event: NotificationEvent, data: NotificationEventData = {}): void {
    const payload: NotificationJobData = { userId, event, data };

    if (!this.queue) {
      void this.processInline(payload);
      return;
    }

    this.queue
      .add(event, payload, { jobId: `${event}:${data.orderId ?? userId}` })
      .catch((error) => {
        this.logger.warn(
          `Falha ao enfileirar ${event} (${error instanceof Error ? error.message : error}); processando inline`,
        );
        void this.processInline(payload);
      });
  }

  /** Notificações internas do usuário autenticado. */
  async listForUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    notifications: NotificationSummary[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const where = { userId };

    const [total, notifications] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    return {
      notifications,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  private async processInline(payload: NotificationJobData): Promise<void> {
    try {
      await this.processor.handle(payload);
    } catch (error) {
      this.logger.error(
        `Falha ao processar notificação inline ${payload.event}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private buildConnection(): ConnectionOptions {
    const url = this.configService.getOrThrow<string>('REDIS_URL');
    return redisUrlToConnection(url);
  }
}

/** BullMQ espera host/port separados; REDIS_URL do .env precisa ser decomposto. */
function redisUrlToConnection(rawUrl: string): ConnectionOptions {
  const parsed = new URL(rawUrl);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    // Necessário para Workers do BullMQ (leituras bloqueantes).
    maxRetriesPerRequest: null,
  };
}
