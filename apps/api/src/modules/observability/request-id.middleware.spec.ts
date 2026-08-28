import { RequestIdMiddleware } from './request-id.middleware';
import { getRequestContext } from './request-context';

describe('RequestIdMiddleware', () => {
  it('gera um request id quando ausente e seta o header da resposta', () => {
    const middleware = new RequestIdMiddleware();
    const req = {
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/api/v1/products',
      url: '/api/v1/products',
    };
    const res = { setHeader: jest.fn() };
    let nextCalled = false;

    middleware.use(req as any, res as any, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
  });

  it('mantém o X-Request-Id enviado pelo cliente (primeiro segmento)', () => {
    const middleware = new RequestIdMiddleware();
    const req = {
      headers: { 'x-request-id': ['cli-a', 'cli-b'] },
      ip: '10.0.0.1',
      method: 'GET',
      url: '/x',
    };
    const res = { setHeader: jest.fn() };

    middleware.use(req as any, res as any, () => {
      expect(getRequestContext()).toMatchObject({
        requestId: 'cli-a',
        ip: '10.0.0.1',
        method: 'GET',
      });
    });

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'cli-a');
  });

  it('não deixa contexto vazar fora da requisição', () => {
    const middleware = new RequestIdMiddleware();
    const req = { headers: {}, ip: '9.9.9.9', method: 'GET', url: '/y' };
    middleware.use(req as any, { setHeader: jest.fn() } as any, () => undefined);

    expect(getRequestContext()).toBeUndefined();
  });
});
