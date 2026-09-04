import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerOptions } from '@nestjs/throttler';

/** Limite (janela de 60s) para requisições autenticadas. */
export const AUTH_LIMIT = 200;

/** Limite (janela de 60s) para requisições públicas. */
export const PUBLIC_LIMIT = 100;

/** Limite (janela de 60s) para endpoints sensíveis de autenticação. */
export const AUTH_ENDPOINT_LIMIT = 30;

/** Rotas isentas de rate limiting (healthchecks e scrape de métricas). */
const SKIP_PATHS = ['/api/v1/health', '/api/v1/ready', '/api/v1/metrics'];

function pathnameOf(context: ExecutionContext): string {
  const request = context.switchToHttp().getRequest<{ originalUrl?: string }>();
  return String(request.originalUrl ?? '').split('?')[0];
}

export const rateLimitConfig: ThrottlerOptions[] = [
  {
    ttl: 60_000,
    limit: (context) => {
      const request = context.switchToHttp().getRequest<{ user?: unknown }>();
      return Boolean(request.user) ? AUTH_LIMIT : PUBLIC_LIMIT;
    },
    getTracker: (request) => {
      const user = request.user as { id?: string } | undefined;
      if (user?.id) {
        return `user:${user.id}`;
      }
      return `ip:${request.ip ?? request.socket?.remoteAddress ?? 'unknown'}`;
    },
    skipIf: (context) => SKIP_PATHS.includes(pathnameOf(context)),
  },
];