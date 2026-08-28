import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { RequestIdMiddleware } from './request-id.middleware';

/**
 * Observabilidade: request-id correlação (middleware global), logging
 * estruturado por requisição (interceptor global) e endpoint `/metrics` no
 * formato Prometheus.
 */
@Module({
  controllers: [MetricsController],
  exports: [MetricsService],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
