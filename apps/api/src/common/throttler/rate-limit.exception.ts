import { HttpException, HttpStatus } from '@nestjs/common';

export class RateLimitException extends HttpException {
  constructor(message = 'Muitas requisições. Tente novamente em instantes') {
    super(
      {
        code: 'RATE_LIMITED',
        message,
        details: null,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}