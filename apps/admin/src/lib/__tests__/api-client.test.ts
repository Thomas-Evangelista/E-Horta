import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiRequest,
  apiUpload,
  bindApiSession,
  bindTokenUpdater,
  setAccessToken,
} from '../api-client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiRequest', () => {
  let getToken: ReturnType<typeof vi.fn>;
  let refreshTokens: ReturnType<typeof vi.fn>;
  let onSessionExpired: ReturnType<typeof vi.fn>;
  let updateTokens: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getToken = vi.fn(() => 'admin-token');
    refreshTokens = vi.fn();
    onSessionExpired = vi.fn();
    updateTokens = vi.fn();
    bindApiSession({ getToken, refreshTokens, onSessionExpired });
    bindTokenUpdater(updateTokens);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('faz GET e retorna o envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [{ id: 1 }], meta: { total: 1 }, error: null }));

    const env = await apiRequest<Array<{ id: number }>>('/products');
    expect(env.data).toEqual([{ id: 1 }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://localhost:8080/products');
    expect(init.method).toBe('GET');
    expect(init.headers['Authorization']).toBe('Bearer admin-token');
  });

  it('infere POST quando há body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { data: null, meta: {}, error: null }));
    await apiRequest('/products', { body: { name: 'Tomate' } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Tomate' }));
  });

  it('monta query string filtrando undefined/vazio', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [], meta: {}, error: null }));
    await apiRequest('/orders', { query: { page: 2, status: 'PENDING', empty: '', missing: undefined } });
    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.get('status')).toBe('PENDING');
    expect(parsed.searchParams.has('empty')).toBe(false);
    expect(parsed.searchParams.has('missing')).toBe(false);
  });

  it('renova o token e refaz no 401', async () => {
    refreshTokens.mockResolvedValue('new-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { data: null, meta: {}, error: { code: 'UNAUTHORIZED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true }, meta: {}, error: null }));

    const env = await apiRequest<{ ok: boolean }>('/me');
    expect(refreshTokens).toHaveBeenCalled();
    expect(updateTokens).toHaveBeenCalledWith('new-token');
    expect(fetchMock.mock.calls[1][1].headers['Authorization']).toBe('Bearer new-token');
    expect(env.data).toEqual({ ok: true });
  });

  it('lança SESSION_EXPIRED e chama onSessionExpired quando a renovação falha', async () => {
    refreshTokens.mockResolvedValue(null);
    fetchMock.mockResolvedValue(jsonResponse(401, { data: null, meta: {}, error: { code: 'UNAUTHORIZED', message: 'x' } }));

    const err = await apiRequest('/me').catch((e: unknown) => e) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('SESSION_EXPIRED');
    expect(err.status).toBe(401);
    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('lança ApiError a partir do erro do envelope em resposta não-ok', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { data: null, meta: {}, error: { code: 'VALIDATION', message: 'inválido' } }),
    );
    const err = await apiRequest('/products').catch((e: unknown) => e) as ApiError;
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toBe('inválido');
    expect(err.status).toBe(400);
  });

  it('lança MALFORMED para resposta 2xx sem envelope', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ foo: 1 }), { status: 200 }));
    const err = await apiRequest('/products').catch((e: unknown) => e) as ApiError;
    expect(err.code).toBe('MALFORMED');
  });

  it('setAccessToken atualiza o token sem renovar', async () => {
    setAccessToken('novo-token');
    fetchMock.mockResolvedValue(jsonResponse(200, { data: null, meta: {}, error: null }));
    await apiRequest('/products');
    expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Bearer novo-token');
  });
});

describe('apiUpload', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('admin-token');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia FormData com o arquivo e retorna o envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { data: { url: 'https://cdn/x.jpg' }, meta: {}, error: null }));
    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });

    const env = await apiUpload<{ url: string }>('/uploads', file, { productId: 'p1' });
    expect(env.data).toEqual({ url: 'https://cdn/x.jpg' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/uploads');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('file')).toBe(file);
    expect(init.body.get('productId')).toBe('p1');
    expect(init.headers['Authorization']).toBe('Bearer admin-token');
    expect(init.headers['Content-Type']).toBeUndefined();
  });
});
