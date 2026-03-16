import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Swagger — internal service docs
  const config = new DocumentBuilder()
    .setTitle('Auth Service')
    .setDescription('MyNook Auth Service — Internal API (đăng ký, đăng nhập, refresh token)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);

  Logger.log(`Auth Service is running on: http://localhost:${port}`);
  Logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
