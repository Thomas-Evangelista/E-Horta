import { ApiError } from './errors';
import type { ApiEnvelope } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

interface SessionSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
}

type SessionProvider = () => SessionSnapshot;
type SessionInvalidator = () => void;
type TokenRefresher = (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string }>;

let getSession: SessionProvider = () => ({ accessToken: null, refreshToken: null });
let onSessionExpired: SessionInvalidator = () => {};
let refreshTokens: TokenRefresher | null = null;

/**
 * Liga o cliente HTTP à store de sessão. Chamado uma vez no bootstrap
 * (`stores/session.ts`) para evitar dependência circular.
 */
export function bindApiSession(options: {
  getSession: SessionProvider;
  onSessionExpired: SessionInvalidator;
  refreshTokens: TokenRefresher;
}): void {
  getSession = options.getSession;
  onSessionExpired = options.onSessionExpired;
  refreshTokens = options.refreshTokens;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const envelope = payload as ApiEnvelope<T> | null;
  if (!envelope || typeof envelope !== 'object' || !('data' in envelope || 'error' in envelope)) {
    throw new ApiError('Resposta inválida da API', {
      code: 'UNKNOWN_ERROR',
      status: response.status,
    });
  }
  return envelope;
}

function toApiError(error: { code: string; message: string; details?: Array<{ field: string; message: string }> }, status: number): ApiError {
  return new ApiError(error.message, { code: error.code, status, details: error.details });
}

async function execute(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(buildUrl(path, options.query), {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  let response: Response;
  try {
    response = await execute(path, options, getSession().accessToken);
  } catch {
    throw new ApiError('Falha de conexão', { code: 'NETWORK_ERROR' });
  }

  // Access token expirado → tenta renovar uma vez e refaz a requisição.
  if (response.status === 401 && refreshTokens) {
    const { refreshToken } = getSession();
    if (refreshToken) {
      try {
        const refreshed = await refreshTokens(refreshToken);
        applyRefreshedTokens(refreshed);
        try {
          response = await execute(path, options, refreshed.accessToken);
        } catch {
          throw new ApiError('Falha de conexão', { code: 'NETWORK_ERROR' });
        }
      } catch (error) {
        if (error instanceof ApiError && error.code === 'NETWORK_ERROR') throw error;
        onSessionExpired();
      }
    }
  }

  const envelope = await parseEnvelope<T>(response);

  if (!response.ok || envelope.error) {
    throw toApiError(
      envelope.error ?? { code: 'UNKNOWN_ERROR', message: 'Erro inesperado' },
      response.status,
    );
  }
  return envelope;
}

// Ponte mínima para a store de sessão atualizar tokens pós-refresh.
let applyRefreshedTokens: (tokens: { accessToken: string; refreshToken: string }) => void = () => {};

/** Registrado junto com `bindApiSession` pela store de sessão. */
export function bindTokenUpdater(updater: (tokens: { accessToken: string; refreshToken: string }) => void): void {
  applyRefreshedTokens = updater;
}

/** Upload multipart (ex.: imagens de produto no admin) — sem Content-Type manual, o browser define o boundary. */
export async function apiUpload<T>(
  path: string,
  file: File,
  extra?: Record<string, string>,
): Promise<ApiEnvelope<T>> {
  const form = new FormData();
  form.append('file', file);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) form.append(key, value);
  }

  const headers = new Headers();
  const { accessToken } = getSession();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(buildUrl(path), { method: 'POST', headers, body: form, cache: 'no-store' });
  return parseEnvelope<T>(response);
}
