import { Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { EventEmitter } from 'node:events';
import { LoggingInterceptor } from './logging.interceptor';
import { MetricsService } from './metrics.service';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let metrics: MetricsService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    metrics = new MetricsService();
    interceptor = new LoggingInterceptor(metrics);
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  function fakeHttpContext(req: object, res: object): ExecutionContext {
    return {
      getType: () => 'http' as const,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
  }

  function makeResponseEmitter(): EventEmitter & { statusCode?: number } {
    const res: EventEmitter & { statusCode?: number } = new EventEmitter();
    res.statusCode = 201;
    return res;
  }

  it('alimenta métricas e registra log ao finalizar a resposta', async () => {
    const res = makeResponseEmitter();
    const req = {
      method: 'POST',
      url: '/api/v1/admin/audit',
      path: '/api/v1/admin/audit',
      route: { path: '/admin/audit' },
      headers: {},
      user: { id: 'u1' },
    } as any;

    const handler: CallHandler = { handle: () => of('ok') };
    const observable = interceptor.intercept(fakeHttpContext(req, res), handler);
    await new Promise<void>((resolve) => observable.subscribe({ complete: resolve }));
    res.emit('finish');

    const text = metrics.getMetricsText();
    expect(text).toContain(
      'http_requests_total{method="POST",route="/admin/audit",status="201"} 1',
    );
    expect(text).toContain('http_request_duration_seconds_sum{method="POST"}');

    const log = loggerSpy.mock.calls[0]?.[0] as {
      requestId: string;
      method: string;
      route: string;
      status: number;
      ip: string | undefined;
      userId: string | undefined;
    };
    expect(log.method).toBe('POST');
    expect(log.route).toBe('/admin/audit');
    expect(log.status).toBe(201);
    expect(log.userId).toBe('u1');
  });

  it('registra apenas uma vez quando finish e close disparam juntos', async () => {
    const res = makeResponseEmitter();
    const req = {
      method: 'GET',
      url: '/api/v1/products',
      path: '/api/v1/products',
      route: { path: '/products' },
      headers: {},
    } as any;

    const observable = interceptor.intercept(fakeHttpContext(req, res), {
      handle: () => of([]),
    } as CallHandler);
    await new Promise<void>((resolve) => observable.subscribe({ complete: resolve }));
    res.emit('finish');
    res.emit('close');

    expect(metrics.getMetricsText()).toContain(
      'http_requests_total{method="GET",route="/products",status="201"} 1',
    );
  });

  it('ignora o scrape do /metrics para não alimentar as próprias métricas', async () => {
    const res = makeResponseEmitter();
    const req = {
      method: 'GET',
      url: '/api/v1/metrics',
      path: '/api/v1/metrics',
      route: { path: '/metrics' },
      headers: {},
    } as any;

    const observable = interceptor.intercept(fakeHttpContext(req, res), {
      handle: () => of(''),
    } as CallHandler);
    await new Promise<void>((resolve) => observable.subscribe({ complete: resolve }));
    res.emit('finish');

    expect(metrics.getMetricsText()).not.toContain('route="/metrics"');
  });
});
