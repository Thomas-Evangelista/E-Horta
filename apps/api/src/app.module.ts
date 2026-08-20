import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { configValidation } from './config/config.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: configValidation,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
