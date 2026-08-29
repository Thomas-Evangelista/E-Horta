const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export type ApiEnvelope<T> = {
  data: T | null;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
  error: { code: string; message: string; details?: unknown } | null;
};

type RequestOptions = {
  body?: unknown;
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
} & Omit<RequestInit, 'body' | 'method'>;

let accessToken: string | null = null;
let getToken: (() => string | null) | null = null;
let refreshFn: (() => Promise<string | null>) | null = null;
let onUnauthorized: (() => void) | null = null;
let tokenUpdater: ((token: string) => void) | null = null;

export function bindApiSession(opts: {
  getToken: () => string | null;
  refreshTokens: () => Promise<string | null>;
  onSessionExpired: () => void;
}) {
  getToken = opts.getToken;
  refreshFn = opts.refreshTokens;
  onUnauthorized = opts.onSessionExpired;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

function currentAccessToken(): string | null {
  return getToken?.() ?? accessToken;
}

export function bindTokenUpdater(fn: (token: string) => void) {
  tokenUpdater = fn;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { body, query, ...init } = opts;

  const url = new URL(`${BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> ?? {}) };
  const token = currentAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const method = init.method ?? (body ? 'POST' : 'GET');

  const res = await fetch(url.toString(), {
    ...init,
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 401 && refreshFn) {
    const newToken = await refreshFn();
    if (newToken) {
      accessToken = newToken;
      tokenUpdater?.(newToken);
      headers['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(url.toString(), {
        ...init,
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
      if (!retry.ok) {
        onUnauthorized?.();
        throw new ApiError('SESSION_EXPIRED', 'Sessão expirada', 401);
      }
      return parseEnvelope<T>(retry);
    }
    onUnauthorized?.();
    throw new ApiError('SESSION_EXPIRED', 'Sessão expirada', 401);
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const err = json?.error;
    throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? `Erro ${res.status}`, res.status, err?.details);
  }

  return parseEnvelope<T>(res);
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  const json = await res.json();
  if (json && typeof json === 'object' && ('data' in json || 'error' in json)) {
    return json as ApiEnvelope<T>;
  }
  throw new ApiError('MALFORMED', 'Resposta mal formatada', 500);
}

export async function apiUpload<T>(path: string, file: File, extra?: Record<string, string>): Promise<ApiEnvelope<T>> {
  const url = new URL(`${BASE}${path}`);
  const form = new FormData();
  form.append('file', file);
  if (extra) Object.entries(extra).forEach(([k, v]) => form.append(k, v));

  const headers: Record<string, string> = {};
  const token = currentAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { method: 'POST', headers, body: form, cache: 'no-store' });
  return parseEnvelope<T>(res);
}
