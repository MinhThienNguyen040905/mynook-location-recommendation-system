import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger — internal service docs
  const config = new DocumentBuilder()
    .setTitle('Search AI Service')
    .setDescription('MyNook Search AI Service — Internal API (tìm kiếm, gợi ý AI)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 3004;
  await app.listen(port);

  Logger.log(`Search AI Service is running on: http://localhost:${port}`);
  Logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
