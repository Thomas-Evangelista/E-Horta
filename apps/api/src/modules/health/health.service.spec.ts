import { HealthService } from './health.service';
import { MetricsService } from '../observability/metrics.service';

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      ping: jest.fn().mockResolvedValue('PONG'),
      disconnect: jest.fn(),
    })),
  };
});

import { Redis } from 'ioredis';

const RedisMock = Redis as unknown as jest.Mock;

describe('HealthService', () => {
  const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
  const configService = { get: jest.fn().mockReturnValue('redis://localhost:6379') };

  function buildService(metrics: MetricsService): HealthService {
    return new HealthService(prisma as any, configService as any, metrics);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna ok quando banco, redis e memória respondem', async () => {
    const metrics = new MetricsService();
    const result = await buildService(metrics).check();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeTruthy();
    expect(result.checks.database).toMatchObject({ status: 'ok' });
    expect(result.checks.redis).toMatchObject({ status: 'ok' });
    expect(result.checks.redis.latencyMs).toBeGreaterThanOrEqual(0);

    const text = metrics.getMetricsText();
    expect(text).toContain('ehorta_database_up 1');
    expect(text).toContain('ehorta_redis_up 1');
  });

  it('marca erro global quando o redis falha', async () => {
    RedisMock.mockImplementationOnce(() => ({
      ping: jest.fn().mockRejectedValue(new Error('connection refused')),
      disconnect: jest.fn(),
    }));

    const metrics = new MetricsService();
    const result = await buildService(metrics).check();

    expect(result.status).toBe('error');
    expect(result.checks.redis.status).toBe('error');
    expect(result.checks.redis.error).toContain('connection refused');
    expect(result.checks.database.status).toBe('ok');
    expect(metrics.getMetricsText()).toContain('ehorta_redis_up 0');
    expect(metrics.getMetricsText()).toContain('ehorta_database_up 1');
  });

  it('marca erro global quando o banco falha', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('db down'));

    const result = await buildService(new MetricsService()).check();

    expect(result.status).toBe('error');
    expect(result.checks.database.status).toBe('error');
    expect(result.checks.redis.status).toBe('ok');
  });

  it('ready depende do banco e do redis', async () => {
    const result = await buildService(new MetricsService()).ready();
    expect(result).toEqual({ status: 'ready' });
  });

  it('desconecta o cliente de redis descartável após o check', async () => {
    await buildService(new MetricsService()).check();

    const lastClient = RedisMock.mock.results.at(-1)?.value as {
      disconnect: jest.Mock;
      ping: jest.Mock;
    };
    expect(lastClient.ping).toHaveBeenCalled();
    expect(lastClient.disconnect).toHaveBeenCalled();
  });
});