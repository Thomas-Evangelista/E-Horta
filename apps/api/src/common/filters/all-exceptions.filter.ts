import type {
  ExceptionFilter,
  ArgumentsHost} from '@nestjs/common';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let code = 'INTERNAL_ERROR';
    let details: Array<{ field: string; message: string }> | undefined;
    let hasCustomCode = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const res = exResponse as Record<string, unknown>;
        message = (res.message as string) || message;
        details = res.details as Array<{ field: string; message: string }> | undefined;

        if (typeof res.code === 'string' && res.code.length > 0) {
          code = res.code;
          hasCustomCode = true;
        }

        if (Array.isArray(res.message)) {
          message = 'Erro de validação';
          details = (res.message as string[]).map((msg) => ({
            field: '',
            message: msg,
          }));
        }
      }

      // Códigos de negócio customizados (ex.: OUT_OF_STOCK, EMPTY_CART)
      // têm precedência sobre o mapeamento genérico por status HTTP.
      if (!hasCustomCode) {
        switch (status) {
          case 400:
            code = 'VALIDATION_ERROR';
            break;
          case 401:
            code = 'AUTHENTICATION_ERROR';
            break;
          case 403:
            code = 'AUTHORIZATION_ERROR';
            break;
          case 404:
            code = 'NOT_FOUND';
            break;
          case 409:
            code = 'CONFLICT';
            break;
          default:
            code = 'HTTP_ERROR';
        }
      }
    }

    this.logger.error(`Exception: ${code} - ${message}`, exception instanceof Error ? exception.stack : '');

    response.status(status).json({
      data: null,
      meta: {},
      error: {
        code,
        message,
        details,
      },
    });
  }
}
