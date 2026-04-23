import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RmqModule, getRmqUrl } from '@mynook/rmq-messaging';
import { RMQ_QUEUES } from '@mynook/shared-types';
import { connect } from 'amqplib';
import { AppModule } from './app/app.module';

/** Check if RabbitMQ is reachable before connecting transport */
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
  const logger = new Logger('SearchAiService');

  // Connect RMQ consumer if RabbitMQ is available
  const rmqUrl = getRmqUrl();
  const rmqAvailable = await isRmqAvailable(rmqUrl);

  if (rmqAvailable) {
    app.connectMicroservice(
      RmqModule.buildConsumerOptions({
        queue: RMQ_QUEUES.SEARCH_AI,
        routingKeys: ['venue.reviewed', 'venue.*'],
      }),
    );
    await app.startAllMicroservices();
    logger.log(`RMQ consumer connected to: ${rmqUrl}`);
  } else {
    logger.warn(
      `RabbitMQ not available at ${rmqUrl}. Running HTTP-only mode.`,
    );
  }

  // Swagger — internal service docs
  const config = new DocumentBuilder()
    .setTitle('Search AI Service')
    .setDescription(
      'MyNook Search AI Service — Internal API (hybrid search, AI review processing)',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 3005;
  await app.listen(port);

  logger.log(`Search AI Service is running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
