import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

/**
 * Lấy RabbitMQ URL từ environment variables.
 * Hỗ trợ CloudAMQP (amqps://) và local (amqp://localhost:5672).
 *
 * Thứ tự ưu tiên: RMQ_URL > CLOUDAMQP_URL > fallback localhost
 */
export function getRmqUrl(): string {
  return (
    process.env['RMQ_URL'] ||
    process.env['CLOUDAMQP_URL'] ||
    'amqp://localhost:5672'
  );
}

export interface RmqModuleOptions {
  name: string; // injection token, e.g. INTERACTION_SERVICE
  queue: string; // RabbitMQ queue name
  url?: string; // override amqp URL (nếu không truyền sẽ đọc từ env)
}

@Module({})
export class RmqModule {
  /**
   * Register a RabbitMQ client that can be injected via @Inject(name).
   * Used by services that need to EMIT events (e.g. auth-service → interaction-service).
   *
   * URL resolution: options.url → RMQ_URL env → CLOUDAMQP_URL env → localhost
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
              urls: [options.url || getRmqUrl()],
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
