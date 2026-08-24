import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { PrismaService } from '../../database/prisma.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  Worker: jest.fn(),
}));

const mockedQueue = Queue as unknown as jest.Mock;
const mockedWorker = Worker as unknown as jest.Mock;

describe('NotificationsService', () => {
  let service: NotificationsService;
  let processor: { handle: jest.Mock };
  let prisma: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const buildQueueMock = (addImpl: jest.Mock) => ({
    add: addImpl,
    close: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    processor = { handle: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (input: unknown) =>
        Array.isArray(input) ? Promise.all(input as Promise<unknown>[]) : input,
      ),
    };
  });

  async function buildService(): Promise<void> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379'),
          },
        },
        { provide: NotificationsProcessor, useValue: processor },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
    service.onModuleInit();
  }

  afterEach(async () => {
    await service?.onModuleDestroy();
  });

  it('deve inicializar fila e worker com a REDIS_URL configurada', async () => {
    // Fila bem-sucedida
    mockedQueue.mockImplementationOnce(() => buildQueueMock(jest.fn().mockResolvedValue({})));
    mockedWorker.mockImplementationOnce(() => ({ on: jest.fn(), close: jest.fn() }));

    await buildService();

    expect(mockedQueue).toHaveBeenCalledWith('notifications', expect.anything());
    expect(mockedWorker).toHaveBeenCalledWith(
      'notifications',
      expect.any(Function),
      expect.objectContaining({ concurrency: 5 }),
    );
  });

  it('deve enfileirar e não processar inline quando o enqueue funciona', async () => {
    mockedQueue.mockImplementationOnce(() => buildQueueMock(jest.fn().mockResolvedValue({})));
    mockedWorker.mockImplementationOnce(() => ({ on: jest.fn(), close: jest.fn() }));
    await buildService();

    service.notify('user-1', 'ORDER_CREATED', { orderNumber: 'EH-1', orderId: 'order-1' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const queueInstance = mockedQueue.mock.results[0].value;
    expect(queueInstance.add).toHaveBeenCalledWith(
      'ORDER_CREATED',
      expect.objectContaining({ userId: 'user-1', event: 'ORDER_CREATED' }),
      expect.anything(),
    );
    expect(processor.handle).not.toHaveBeenCalled();
  });

  it('deve cair para processamento inline quando o Redis falha no enqueue', async () => {
    mockedQueue.mockImplementationOnce(() =>
      buildQueueMock(jest.fn().mockRejectedValue(new Error('Redis indisponível'))),
    );
    mockedWorker.mockImplementationOnce(() => ({ on: jest.fn(), close: jest.fn() }));
    await buildService();

    service.notify('user-2', 'ACCOUNT_CREATED', {});
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(processor.handle).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2', event: 'ACCOUNT_CREATED' }),
    );
  });

  it('deve processar inline diretamente quando não há fila inicializada', async () => {
    // Simula inicialização sem fila (Redis ausente no boot)
    mockedQueue.mockImplementationOnce(() => {
      throw new Error('Redis indisponível');
    });
    await buildService();
    expect((service as unknown as { queue: unknown }).queue).toBeNull();

    service.notify('user-3', 'ORDER_DELIVERED', { orderNumber: 'EH-3' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(processor.handle).toHaveBeenCalledTimes(1);
  });

  it('nunca deve propagar erro de processamento para o chamador', async () => {
    mockedQueue.mockImplementationOnce(() => {
      throw new Error('Redis indisponível');
    });
    processor.handle.mockRejectedValue(new Error('DB fora do ar'));
    await buildService();

    expect(() =>
      service.notify('user-4', 'PAYMENT_FAILED', { orderNumber: 'EH-4' }),
    ).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('deve listar notificações do usuário e contar não lidas', async () => {
    // Sem fila (testes de leitura não precisam dela)
    mockedQueue.mockImplementationOnce(() => {
      throw new Error('skip');
    });
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'n-1',
        title: 'Pedido em preparação',
        message: 'Seu pedido EH-1 está sendo preparado.',
        read: false,
        createdAt: new Date(),
      },
    ]);
    prisma.notification.count.mockResolvedValue(1);
    await buildService();

    const listResult = await service.listForUser('user-1');
    expect(listResult.notifications).toHaveLength(1);
    expect(listResult.meta.total).toBe(1);

    const unread = await service.countUnread('user-1');
    expect(unread).toBe(1);

    await service.markRead('user-1', 'n-1');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n-1', userId: 'user-1' },
      data: { read: true },
    });

    await service.markAllRead('user-1');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', read: false },
      data: { read: true },
    });
  });
});
