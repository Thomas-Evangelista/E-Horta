import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { MetricsService } from '../observability/metrics.service';

interface ComponentHealth {
  status: 'ok' | 'error';
  latencyMs?: number;
  usageMb?: number;
  error?: string;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  async check(): Promise<HealthStatus> {
    const results = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);

    const database = this.settle(results[0]!);
    const redis = this.settle(results[1]!);
    const memory = this.settle(results[2]!);

    this.metrics.setGauge('ehorta_database_up', database.status === 'ok' ? 1 : 0);
    this.metrics.setGauge('ehorta_redis_up', redis.status === 'ok' ? 1 : 0);

    const overallStatus =
      database.status === 'ok' && redis.status === 'ok' && memory.status === 'ok' ? 'ok' : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: { database, redis, memory },
    };
  }

  async ready(): Promise<{ status: string }> {
    await Promise.all([this.prisma.$queryRaw`SELECT 1`, this.pingRedis()]);
    return { status: 'ready' };
  }

  private settle(result: PromiseSettledResult<ComponentHealth>): ComponentHealth {
    return result.status === 'fulfilled'
      ? result.value
      : { status: 'error' as const, error: String(result.reason) };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      return { status: 'error', error: String(error) };
    }
  }

  private async pingRedis(): Promise<void> {
    const client = this.buildRedisClient();
    try {
      await client.ping();
    } finally {
      client.disconnect();
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    const client = this.buildRedisClient();
    try {
      await client.ping();
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (error) {
      this.logger.error('Redis health check failed', error as Error);
      return { status: 'error', error: String(error) };
    } finally {
      client.disconnect();
    }
  }

  /** Cliente descartável: sem reconexão, timeout curto. */
  private buildRedisClient(): Redis {
    const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    return new Redis(url, {
      lazyConnect: true,
      connectTimeout: 1500,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
  }

  private async checkMemory(): Promise<ComponentHealth> {
    try {
      const mem = process.memoryUsage();
      return {
        status: 'ok',
        usageMb: Math.round(mem.heapUsed / 1024 / 1024),
      };
    } catch (error) {
      return { status: 'error', error: String(error) };
    }
  }
}
