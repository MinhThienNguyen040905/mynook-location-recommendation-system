import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RmqModule, getRmqUrl } from '@mynook/rmq-messaging';
import { RMQ_QUEUES } from '@mynook/shared-types';
import { connect } from 'amqplib';
import { AppModule } from './app/app.module';

/** Kiểm tra RabbitMQ có reachable không trước khi connect transport */
async function isRmqAvailable(url: string): Promise<boolean> {
  try {
    const conn = await connect(url);
    await conn.close();
    return true;
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('InteractionService');

  // Chỉ connect RMQ transport nếu RabbitMQ đang chạy
  const rmqUrl = getRmqUrl();
  const rmqAvailable = await isRmqAvailable(rmqUrl);

  if (rmqAvailable) {
    app.connectMicroservice(
      RmqModule.buildConsumerOptions({
        queue: RMQ_QUEUES.INTERACTION,
        routingKeys: ['user.*', 'venue.reviewed'],
      }),
    );
    await app.startAllMicroservices();
    logger.log(`RMQ consumer connected to: ${rmqUrl}`);
  } else {
    logger.warn(`RabbitMQ not available at ${rmqUrl}. Running HTTP-only mode (events via POST /notifications/events/*).`);
  }

  // Swagger — internal service docs
  const config = new DocumentBuilder()
    .setTitle('Interaction Service')
    .setDescription('MyNook Interaction Service — Internal API (reviews, bookmarks, notifications)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 3004;
  await app.listen(port);

  logger.log(`Interaction Service is running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
