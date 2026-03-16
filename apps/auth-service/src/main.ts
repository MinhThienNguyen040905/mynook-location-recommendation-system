import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);

  Logger.log(`Auth Service is running on: http://localhost:${port}`);
}

bootstrap();
