import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RMQ_QUEUES } from '@mynook/shared-types';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect RabbitMQ microservice transport (hybrid app: HTTP + RMQ)
  const rmqUrl = process.env['RMQ_URL'] || 'amqp://localhost:5672';
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: RMQ_QUEUES.INTERACTION,
      queueOptions: { durable: true },
    },
  });

  // Swagger — internal service docs
  const config = new DocumentBuilder()
    .setTitle('Interaction Service')
    .setDescription('MyNook Interaction Service — Internal API (reviews, bookmarks, notifications)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();

  const port = Number(process.env.PORT) || 3004;
  await app.listen(port);

  Logger.log(`Interaction Service is running on: http://localhost:${port}`);
  Logger.log(`Interaction Service RMQ consumer connected to: ${rmqUrl}`);
  Logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
