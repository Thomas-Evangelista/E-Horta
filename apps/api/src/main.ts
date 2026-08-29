import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { StructuredLogger } from './modules/observability/structured.logger';

async function bootstrap() {
  // rawBody é necessário para validar a assinatura HMAC dos webhooks.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // Logging estruturado: JSON em produção (para coleta centralizada), texto em dev.
  app.useLogger(new StructuredLogger({ pretty: !isProduction }));

  app.use(helmet());

  // CORS_ORIGIN aceita origens separadas por vírgula (ex.: web e admin em dev).
  const corsOrigin = (configService.get<string>('CORS_ORIGIN', 'http://localhost:3000') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('E-Horta API')
      .setDescription('API da plataforma de e-commerce de hortaliças e produtos frescos')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 8080);
  await app.listen(port);

  logger.log(`Application running on port ${port}`);

  if (!isProduction) {
    logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
