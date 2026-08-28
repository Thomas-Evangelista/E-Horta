import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { MetricsService } from './metrics.service';

@ApiTags('Observabilidade')
@Public()
@Controller()
export class MetricsController {
  private static readonly startedAt = Date.now();

  constructor(private readonly metrics: MetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Métricas no formato Prometheus para scraping' })
  collect(): string {
    const memory = process.memoryUsage();
    this.metrics.setGauge('nodejs_heap_bytes', memory.heapUsed);
    this.metrics.setGauge('nodejs_heap_total_bytes', memory.heapTotal);
    this.metrics.setGauge('nodejs_rss_bytes', memory.rss);
    this.metrics.setGauge('nodejs_uptime_seconds', process.uptime());
    this.metrics.setGauge('process_start_time_seconds', MetricsController.startedAt / 1000);
    return this.metrics.getMetricsText();
  }
}
