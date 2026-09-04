import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerOptions, ThrottlerStorage } from '@nestjs/throttler';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitException } from './rate-limit.exception';
import {
  rateLimitConfig,
  AUTH_LIMIT,
  PUBLIC_LIMIT,
  AUTH_ENDPOINT_LIMIT,
} from './rate-limit.config';

const makeContext = (request: Record<string, unknown>): ExecutionContext => {
  const req = {
    originalUrl: '/api/v1/whatever',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...request,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ header: jest.fn() }),
    }),
    getHandler: () => TestHandler,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
function TestHandler() {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
function TestController() {}

const blockedStorage: ThrottlerStorage = {
  increment: jest.fn().mockResolvedValue({
    totalHits: 3,
    timeToExpire: 60,
    isBlocked: true,
    timeToBlockExpire: 60,
  }),
};

const okStorage: ThrottlerStorage = {
  increment: jest.fn().mockResolvedValue({
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
  }),
};

describe('RateLimitGuard (throttling)', () => {
  it('deve bloquear com RateLimitException quando o limite é excedido', async () => {
    const guard = new RateLimitGuard(
      [{ ttl: 60_000, limit: 3 }],
      blockedStorage,
      new Reflector(),
    );
    await guard.onModuleInit();

    await expect(guard.canActivate(makeContext({}))).rejects.toBeInstanceOf(
      RateLimitException,
    );
  });

  it('deve responder 429 com código RATE_LIMITED', async () => {
    const guard = new RateLimitGuard(
      [{ ttl: 60_000, limit: 3 }],
      blockedStorage,
      new Reflector(),
    );
    await guard.onModuleInit();

    try {
      await guard.canActivate(makeContext({}));
      throw new Error('esperava throttling');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitException);
      expect((error as RateLimitException).getStatus()).toBe(429);
      expect((error as RateLimitException).getResponse()).toMatchObject({
        code: 'RATE_LIMITED',
      });
    }
  });

  it('deve liberar a requisição dentro do limite', async () => {
    const guard = new RateLimitGuard(
      [{ ttl: 60_000, limit: 3 }],
      okStorage,
      new Reflector(),
    );
    await guard.onModuleInit();

    await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
  });

  it('deve pular throttling em /health e /metrics', async () => {
    const throttler = rateLimitConfig[0];

    await expect(throttler.skipIf?.(makeContext({ originalUrl: '/api/v1/health' }))).toBe(true);
    await expect(
      throttler.skipIf?.(makeContext({ originalUrl: '/api/v1/health?x=1' })),
    ).toBe(true);
    await expect(throttler.skipIf?.(makeContext({ originalUrl: '/api/v1/metrics' }))).toBe(true);
    await expect(throttler.skipIf?.(makeContext({ originalUrl: '/api/v1/ready' }))).toBe(true);
    await expect(
      throttler.skipIf?.(makeContext({ originalUrl: '/api/v1/products' })),
    ).toBe(false);
  });

  it('deve aplicar limite autenticado (200) e público (100) por minuto', async () => {
    const throttler = rateLimitConfig[0];

    await expect(
      callLimit(throttler.limit, makeContext({ user: { id: 'u1' } })),
    ).toBe(AUTH_LIMIT);
    await expect(callLimit(throttler.limit, makeContext({}))).toBe(PUBLIC_LIMIT);
  });

  it('deve ratear por usuário logado e por IP em rotas públicas', async () => {
    const throttler = rateLimitConfig[0];

    const userCtx = makeContext({ user: { id: 'u1' } });
    await expect(throttler.getTracker?.(userCtx.switchToHttp().getRequest() as never, userCtx)).toBe(
      'user:u1',
    );

    const anonCtx = makeContext({ ip: '10.0.0.5' });
    await expect(
      throttler.getTracker?.(anonCtx.switchToHttp().getRequest() as never, anonCtx),
    ).toBe('ip:10.0.0.5');
  });

  it('deve respeitar o limite apertado de endpoints de auth (30/min)', () => {
    expect(AUTH_ENDPOINT_LIMIT).toBeLessThan(PUBLIC_LIMIT);
    expect(AUTH_ENDPOINT_LIMIT).toBe(30);
  });
});

function callLimit(
  limit: ThrottlerOptions['limit'],
  context: ExecutionContext,
): number | Promise<number> {
  return typeof limit === 'function' ? limit(context) : limit;
}