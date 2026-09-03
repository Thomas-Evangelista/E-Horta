import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../errors';
import {
  apiRequest,
  apiUpload,
  bindApiSession,
  bindTokenUpdater,
} from '../api-client';

type JsonResponse = Response;

function jsonResponse(status: number, body: unknown): JsonResponse {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiRequest', () => {
  let getSession: ReturnType<typeof vi.fn>;
  let onSessionExpired: ReturnType<typeof vi.fn>;
  let refreshTokens: ReturnType<typeof vi.fn>;
  let updateTokens: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSession = vi.fn(() => ({ accessToken: 'token-abc', refreshToken: 'refresh-abc' }));
    onSessionExpired = vi.fn();
    refreshTokens = vi.fn();
    updateTokens = vi.fn();
    bindApiSession({ getSession, onSessionExpired, refreshTokens });
    bindTokenUpdater(updateTokens);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('faz GET e retorna o envelope data/meta/error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 1 }, meta: {}, error: null }));

    const env = await apiRequest<{ id: number }>('/products');
    expect(env.data).toEqual({ id: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^http:\/\/localhost:8080\/api\/v1\/products/);
    expect(init.headers.get('Accept')).toBe('application/json');
    expect(init.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(init.cache).toBe('no-store');
  });

  it('serializa o body e define Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { data: null, meta: {}, error: null }));

    await apiRequest('/products', { method: 'POST', body: { name: 'Tomate' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers.get('Content-Type')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'Tomate' }));
    void url;
  });

  it('monta query string ignorando valores undefined/vazios', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [], meta: {}, error: null }));

    await apiRequest<unknown[]>('/products', {
      query: { page: 2, search: 'tom', empty: '', missing: undefined },
    });
    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.get('search')).toBe('tom');
    expect(parsed.searchParams.has('empty')).toBe(false);
    expect(parsed.searchParams.has('missing')).toBe(false);
  });

  it('lança ApiError NETWORK_ERROR quando o fetch falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest('/products')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('lança ApiError com o código do envelope em resposta não-ok', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { data: null, meta: {}, error: { code: 'VALIDATION_ERROR', message: 'inválido' } }),
    );

    const err = await apiRequest('/products').catch((e: unknown) => e) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
  });

  it('lança ApiError quando o envelope carrega error mesmo com status ok', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: null, meta: {}, error: { code: 'NOT_FOUND', message: 'x' } }),
    );

    await expect(apiRequest('/products')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lança UNKNOWN_ERROR para resposta malformada', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, 'não é envelope'));

    await expect(apiRequest('/products')).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' });
  });

  it('renova o token uma vez e refaz a requisição no 401', async () => {
    refreshTokens.mockResolvedValue({ accessToken: 'token-new', refreshToken: 'refresh-new' });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { data: null, meta: {}, error: { code: 'UNAUTHORIZED', message: 'x' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true }, meta: {}, error: null }));

    const env = await apiRequest<{ ok: boolean }>('/me');
    expect(refreshTokens).toHaveBeenCalledWith('refresh-abc');
    expect(updateTokens).toHaveBeenCalledWith({ accessToken: 'token-new', refreshToken: 'refresh-new' });
    // a retry deve usar o novo access token
    const retryHeaders = fetchMock.mock.calls[1][1].headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer token-new');
    expect(env.data).toEqual({ ok: true });
  });

  it('chama onSessionExpired quando a renovação falha', async () => {
    refreshTokens.mockRejectedValue(new Error('refresh inválido'));
    fetchMock.mockResolvedValue(
      jsonResponse(401, { data: null, meta: {}, error: { code: 'UNAUTHORIZED', message: 'x' } }),
    );

    await expect(apiRequest('/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('não renova quando não há refresh token', async () => {
    getSession.mockReturnValue({ accessToken: 'token-abc', refreshToken: null });
    fetchMock.mockResolvedValue(
      jsonResponse(401, { data: null, meta: {}, error: { code: 'UNAUTHORIZED', message: 'x' } }),
    );

    await expect(apiRequest('/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(refreshTokens).not.toHaveBeenCalled();
  });
});

describe('apiUpload', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    bindApiSession({
      getSession: () => ({ accessToken: 'admin-token', refreshToken: null }),
      onSessionExpired: vi.fn(),
      refreshTokens: vi.fn(),
    });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia FormData com o arquivo e retorna o envelope', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { url: 'https://cdn/x.jpg' }, meta: {}, error: null }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });

    const env = await apiUpload<{ url: string }>('/uploads', file, { productId: 'p1' });
    expect(env.data).toEqual({ url: 'https://cdn/x.jpg' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/uploads');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('file')).toBe(file);
    expect(init.body.get('productId')).toBe('p1');
    expect(init.headers.get('Authorization')).toBe('Bearer admin-token');
  });
});
