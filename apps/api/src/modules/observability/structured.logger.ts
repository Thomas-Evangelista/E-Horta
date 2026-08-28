import type { LoggerService } from '@nestjs/common';
import { getRequestContext } from './request-context';

export interface StructuredLoggerOptions {
  /** Emite cada registro como um objeto JSON em uma linha (padrão em produção). */
  pretty?: boolean;
}

/**
 * Logger estruturado compatível com o LoggerService do NestJS. Em produção,
 * cada linha de log é um JSON (`{ level, timestamp, pid, context, requestId,
 * message, ... }`); em desenvolvimento, imprime texto legível no stdout.
 * O `requestId` vem do AsyncLocalStorage (ver RequestIdMiddleware).
 */
export class StructuredLogger implements LoggerService {
  private readonly pretty: boolean;

  constructor(options: StructuredLoggerOptions = {}) {
    this.pretty = options.pretty ?? false;
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', message, ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, ...optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, ...optionalParams);
  }

  private asRecord(message: unknown): unknown {
    if (typeof message === 'string') return message;
    if (message instanceof Error) {
      return { message: message.message, name: message.name, stack: message.stack };
    }
    return message;
  }

  private findContext(optionalParams: unknown[]): string | undefined {
    for (let i = optionalParams.length - 1; i >= 0; i -= 1) {
      const value = optionalParams[i];
      if (typeof value === 'string') return value;
    }
    return undefined;
  }

  private write(level: string, message: unknown, ...optionalParams: unknown[]): void {
    const requestId = getRequestContext()?.requestId;
    const context = this.findContext(optionalParams);
    const body = this.asRecord(message);

    if (this.pretty) {
      const prefix = [
        `[${level.toUpperCase()}]`,
        context ? ` [${context}]` : '',
        requestId ? ` [${requestId}]` : '',
        ':',
      ].join('');
      process.stdout.write(`${prefix} ${typeof body === 'string' ? body : JSON.stringify(body)}\n`);
      return;
    }

    const entry = {
      level,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      context,
      requestId,
      message: body,
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
