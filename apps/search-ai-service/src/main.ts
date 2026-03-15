import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT) || 3004;
  await app.listen(port);

  Logger.log(`Search AI Service is running on: http://localhost:${port}`);
}

bootstrap();
