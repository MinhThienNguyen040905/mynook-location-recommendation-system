import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

export interface RmqModuleOptions {
  name: string; // injection token, e.g. AUTH_SERVICE
  queue: string; // RabbitMQ queue name
  url?: string; // amqp URL (default: amqp://localhost:5672)
}

@Module({})
export class RmqModule {
  /**
   * Register a RabbitMQ client that can be injected via @Inject(name).
   * Used in api-gateway to send messages to microservices.
   */
  static register(options: RmqModuleOptions): DynamicModule {
    return {
      module: RmqModule,
      imports: [
        ClientsModule.register([
          {
            name: options.name,
            transport: Transport.RMQ,
            options: {
              urls: [options.url || 'amqp://localhost:5672'],
              queue: options.queue,
              queueOptions: { durable: true },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
