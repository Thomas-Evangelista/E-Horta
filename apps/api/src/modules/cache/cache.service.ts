import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const REDIS_RETRY_LIMIT = 5;

/**
 * Cache de resposta (cache-aside) sobre Redis, usado para o catálogo
 * público (produtos/categorias). Degrada graciosamente: qualquer falha de
 * Redis é logada como warn e o fluxo cai para o banco (nunca lança erro
 * para os chamadores). Em NODE_ENV=test o cache é desabilitado por padrão
 * para manter os testes e2e determinísticos (dados sempre frescos).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  /** Cache ativo? (false em testes e quando CACHE_ENABLED=false). */
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    const enabledByEnv = config.get<string>('CACHE_ENABLED') !== 'false';
    this.enabled = process.env.NODE_ENV !== 'test' && enabledByEnv;

    const url = config.get<string>('REDIS_URL');
    if (!this.enabled || !url) {
      this.client = null;
      return;
    }

    this.client = new Redis(url, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 2000,
      retryStrategy: (times) =>
        times >= REDIS_RETRY_LIMIT ? null : Math.min(times * 200, 1000),
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Cache Redis error: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const client = this.enabled ? this.client : null;
    if (!client) return null;
    try {
      const raw = await client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache get failed (${key}): ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = this.enabled ? this.client : null;
    if (!client) return;
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed (${key}): ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    const client = this.enabled ? this.client : null;
    if (!client) return;
    try {
      await client.del(key);
    } catch (err) {
      this.logger.warn(`Cache del failed (${key}): ${(err as Error).message}`);
    }
  }

  /**
   * Remove todas as chaves que começam com o prefixo informado
   * (ex.: `cache:products:`), via SCAN em lotes — evita bloquear o Redis
   * como um `KEYS *`.
   */
  async delByPrefix(prefix: string): Promise<void> {
    const client = this.enabled ? this.client : null;
    if (!client) return;
    try {
      const pattern = `${prefix}*`;
      let cursor = '0';
      const keys: string[] = [];

      do {
        const [nextCursor, batch] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (err) {
      this.logger.warn(
        `Cache delByPrefix failed (${prefix}): ${(err as Error).message}`,
      );
    }
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
  }
}