import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const googleMapsOriginPattern = /^https:\/\/(www\.)?google\.[a-z.]+$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (googleMapsOriginPattern.test(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  // Swagger — public API documentation
  const config = new DocumentBuilder()
    .setTitle('MyNook API')
    .setDescription('MyNook Location Review & Discovery — Public API Gateway')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(`API Gateway is running on: http://localhost:${port}/api`);
  Logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
