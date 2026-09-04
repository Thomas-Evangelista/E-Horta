import { INestApplication, Controller, Get, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { RateLimitGuard } from '../src/common/throttler/rate-limit.guard';
import { RateLimitException } from '../src/common/throttler/rate-limit.exception';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

describe('Rate limiting (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60_000,
            limit: 2,
            getTracker: (req) => `ip:${req.ip ?? 'unknown'}`,
          },
        ]),
      ],
      controllers: [PingController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: RateLimitGuard,
        },
        {
          provide: APP_FILTER,
          useClass: AllExceptionsFilter,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('aplica o limite: 200 → headers → 429 com envelope RATE_LIMITED', async () => {
    const first = await request(app.getHttpServer()).get('/ping');
    expect(first.status).toBe(200);
    expect(Number(first.headers['x-ratelimit-limit'])).toBe(2);
    expect(Number(first.headers['x-ratelimit-remaining'])).toBe(1);

    const second = await request(app.getHttpServer()).get('/ping');
    expect(second.status).toBe(200);
    expect(Number(second.headers['x-ratelimit-remaining'])).toBe(0);

    const blocked = await request(app.getHttpServer()).get('/ping');
    expect(blocked.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body.error.message).toContain('Muitas requisições');

    const blocked2 = await request(app.getHttpServer()).get('/ping');
    expect(blocked2.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('RateLimitException mantém status 429 e código RATE_LIMITED', () => {
    const exception = new RateLimitException();
    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.getResponse()).toMatchObject({ code: 'RATE_LIMITED' });
  });
});