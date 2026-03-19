import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  // Swagger — public API documentation
  const config = new DocumentBuilder()
    .setTitle('MyNook API')
    .setDescription('MyNook Location Review & Discovery — Public API Gateway')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`API Gateway is running on: http://localhost:${port}/api`);
  Logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
