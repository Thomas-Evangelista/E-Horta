import { Injectable, Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { getRequestContext } from './request-context';
import { MetricsService } from './metrics.service';

interface AuthedRequest extends Request {
  user?: { id?: string };
}

/**
 * Interceptor global de telemetria: registra uma linha de log estruturado por
 * requisição (com requestId, rota, status, duração e usuário quando autenticado)
 * e alimenta as métricas `http_requests_total` e `http_request_duration_seconds`.
 *
 * A duração/status são capturados nos eventos `finish`/`close` da resposta, que
 * refletem o status final (inclusive erros tratados pelo exception filter).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly recorded = new WeakSet<Response>();

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();
    const ctx = getRequestContext();
    const requestId = ctx?.requestId ?? randomUUID();
    const ip = ctx?.ip ?? req.ip;

    const record = () => {
      if (this.recorded.has(res)) return;
      this.recorded.add(res);
      this.record(req, res, requestId, ip, start);
    };

    res.on('finish', record);
    res.on('close', record);
    return next.handle();
  }

  private record(
    req: AuthedRequest,
    res: Response,
    requestId: string,
    ip: string | undefined,
    start: bigint,
  ): void {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const route = req.route?.path ?? req.path ?? req.url;
    const status = res.statusCode;

    // O scrape do /metrics não alimenta as próprias métricas de request.
    if (route !== '/metrics') {
      this.metrics.increment('http_requests_total', {
        method: req.method,
        route,
        status: String(status),
      });
      this.metrics.observe('http_request_duration_seconds', durationMs / 1000, {
        method: req.method,
      });
    }

    this.logger.log({
      requestId,
      method: req.method,
      route,
      status,
      durationMs: Math.round(durationMs),
      ip,
      userId: req.user?.id,
    });
  }
}
