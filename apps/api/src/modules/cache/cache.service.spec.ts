import type { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

const mockStore = new Map<string, string>();
const mockState = { fail: false };

jest.mock('ioredis', () => {
  class MockRedis {
    status = 'ready';
    on = jest.fn();
    disconnect = jest.fn();

    private maybe<T>(value: T): Promise<T> {
      if (mockState.fail) {
        return Promise.reject(new Error('connection lost'));
      }
      return Promise.resolve(value);
    }

    get = jest.fn((key: string) => this.maybe(mockStore.get(key) ?? null));

    set = jest.fn((key: string, value: string) => {
      if (mockState.fail) {
        return Promise.reject(new Error('connection lost'));
      }
      mockStore.set(key, value);
      return Promise.resolve('OK');
    });

    del = jest.fn((...keys: string[]) => {
      if (mockState.fail) {
        return Promise.reject(new Error('connection lost'));
      }
      keys.forEach((key) => mockStore.delete(key));
      return Promise.resolve(keys.length);
    });

    scan = jest.fn((_cursor: string, _mode: string, pattern: string) => {
      if (mockState.fail) {
        throw new Error('connection lost');
      }
      const prefix = pattern.replace(/\*/g, '');
      const keys = [...mockStore.keys()].filter((key) => key.startsWith(prefix));
      return Promise.resolve(['0', keys]);
    });
  }

  return { __esModule: true, default: MockRedis };
});

function makeConfig(cacheEnabled?: string): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'REDIS_URL') return 'redis://localhost:6379';
      if (key === 'CACHE_ENABLED') return cacheEnabled ?? 'true';
      return undefined;
    }),
  } as unknown as ConfigService;
}

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

describe('CacheService', () => {
  afterEach(() => {
    mockStore.clear();
    mockState.fail = false;
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it('fica desabilitado em NODE_ENV=test (get/set/delByPrefix são no-op)', async () => {
    process.env.NODE_ENV = 'test';
    const service = new CacheService(makeConfig());

    expect(service.enabled).toBe(false);
    await expect(service.get('cache:products:x')).resolves.toBeNull();
    await expect(service.set('cache:products:x', { a: 1 }, 60)).resolves.toBeUndefined();
    await expect(service.del('cache:products:x')).resolves.toBeUndefined();
    await expect(service.delByPrefix('cache:products:')).resolves.toBeUndefined();
  });

  it('desabilita quando CACHE_ENABLED=false', () => {
    process.env.NODE_ENV = 'development';
    expect(new CacheService(makeConfig('false')).enabled).toBe(false);
  });

  it('faz round-trip JSON de set/get quando habilitado', async () => {
    process.env.NODE_ENV = 'development';
    const service = new CacheService(makeConfig('true'));
    expect(service.enabled).toBe(true);

    const payload = { total: 1, ok: true, name: 'tomate' };
    await service.set('cache:products:list:abc', payload, 60);
    await expect(service.get<typeof payload>('cache:products:list:abc')).resolves.toEqual(
      payload,
    );
  });

  it('retorna null para chave inexistente', async () => {
    process.env.NODE_ENV = 'development';
    const service = new CacheService(makeConfig());

    await expect(service.get('cache:nada')).resolves.toBeNull();
  });

  it('del remove apenas a chave informada', async () => {
    process.env.NODE_ENV = 'development';
    const service = new CacheService(makeConfig());

    await service.set('cache:k1', 1, 60);
    await service.set('cache:k2', 2, 60);
    await service.del('cache:k1');

    await expect(service.get('cache:k1')).resolves.toBeNull();
    await expect(service.get('cache:k2')).resolves.toBe(2);
  });

  it('delByPrefix remove apenas chaves com o prefixo', async () => {
    process.env.NODE_ENV = 'development';
    const service = new CacheService(makeConfig());

    await service.set('cache:products:list:aaa', 1, 60);
    await service.set('cache:products:tomate', 2, 60);
    await service.set('cache:categories:list:active', 3, 60);

    await service.delByPrefix('cache:products:');

    await expect(service.get('cache:products:list:aaa')).resolves.toBeNull();
    await expect(service.get('cache:products:tomate')).resolves.toBeNull();
    await expect(service.get('cache:categories:list:active')).resolves.toBe(3);
  });

  it('degrada graciosamente quando o Redis falha (nunca lança para o chamador)', async () => {
    process.env.NODE_ENV = 'development';
    const service = new CacheService(makeConfig());

    await service.set('cache:k', 1, 60);
    mockState.fail = true;

    await expect(service.get('cache:k')).resolves.toBeNull();
    await expect(service.set('cache:k2', 2, 60)).resolves.toBeUndefined();
    await expect(service.del('cache:k')).resolves.toBeUndefined();
    await expect(service.delByPrefix('cache:')).resolves.toBeUndefined();
  });
});