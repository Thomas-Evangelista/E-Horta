import { Injectable, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from './request-context';

/**
 * Middleware de correlação: aceita `X-Request-Id` vindo do cliente (primeiro
 * segmento, caso venha como lista) ou gera um UUID, extrai o `ip` do request e
 * disponibiliza o contexto via AsyncLocalStorage durante todo o ciclo de vida
 * da requisição (guards, interceptors, services e logger estruturado).
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers['x-request-id'];
    const requestId = (Array.isArray(header) ? header[0] : header) || randomUUID();
    res.setHeader('X-Request-Id', requestId);

    runWithRequestContext(
      {
        requestId,
        ip: req.ip,
        method: req.method,
        url: req.originalUrl ?? req.url,
      },
      () => next(),
    );
  }
}
