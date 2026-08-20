import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
    memory: { status: 'ok' | 'error'; usageMb?: number; error?: string };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([this.checkDatabase(), this.checkMemory()]);

    const dbResult = checks[0]!;
    const memResult = checks[1]!;

    const database =
      dbResult.status === 'fulfilled'
        ? dbResult.value
        : { status: 'error' as const, error: String(dbResult.reason) };

    const memory =
      memResult.status === 'fulfilled'
        ? memResult.value
        : { status: 'error' as const, error: String(memResult.reason) };

    const overallStatus =
      database.status === 'ok' && memory.status === 'ok' ? 'ok' : 'error';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: { database, memory },
    };
  }

  async ready(): Promise<{ status: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  }

  private async checkDatabase() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' as const, latencyMs: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'error' as const, error: String(error) };
    }
  }

  private async checkMemory() {
    try {
      const mem = process.memoryUsage();
      return {
        status: 'ok' as const,
        usageMb: Math.round(mem.heapUsed / 1024 / 1024),
      };
    } catch (error) {
      return { status: 'error' as const, error: String(error) };
    }
  }
}
