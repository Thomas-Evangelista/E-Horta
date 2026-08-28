import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [ObservabilityModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
