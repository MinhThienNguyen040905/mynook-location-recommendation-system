import { DynamicModule, Module } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
  type MicroserviceOptions,
} from '@nestjs/microservices';

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

// ── Default exchange name ──────────────────────────────────────
export const MYNOOK_EXCHANGE = 'mynook_events';

// ── Options ────────────────────────────────────────────────────

export interface RmqPublisherOptions {
  /** Injection token, e.g. 'EVENTS_SERVICE' */
  name: string;
  /** Exchange name (default: 'mynook_events') */
  exchange?: string;
  /** Override amqp URL */
  url?: string;
}

export interface RmqConsumerOptions {
  /** Unique queue name cho service này, e.g. 'interaction_queue' */
  queue: string;
  /** Exchange name (default: 'mynook_events') */
  exchange?: string;
  /**
   * Routing key patterns mà service này muốn nhận.
   * Dùng cú pháp topic exchange:
   *   - 'user.registered'  → chỉ nhận event này
   *   - 'user.*'           → nhận mọi user event
   *   - '#'                → nhận tất cả
   *
   * Default: ['#'] (nhận mọi event)
   */
  routingKeys?: string[];
  /** Override amqp URL */
  url?: string;
}

/** @deprecated Dùng RmqPublisherOptions thay thế */
export interface RmqModuleOptions {
  name: string;
  queue: string;
  url?: string;
}

// ── Module ─────────────────────────────────────────────────────

@Module({})
export class RmqModule {
  /**
   * Register a RabbitMQ **publisher** client (Topic Exchange pattern).
   *
   * Dùng ở service cần EMIT event (e.g. auth-service).
   * Inject via `@Inject(options.name)` → `ClientProxy`.
   *
   * ```ts
   * // app.module.ts
   * RmqModule.registerPublisher({ name: 'EVENTS_SERVICE' })
   *
   * // service.ts
   * @Inject('EVENTS_SERVICE') private readonly events: ClientProxy
   * this.events.emit('user.registered', payload);
   * ```
   */
  static registerPublisher(options: RmqPublisherOptions): DynamicModule {
    const exchange = options.exchange || MYNOOK_EXCHANGE;

    return {
      module: RmqModule,
      imports: [
        ClientsModule.register([
          {
            name: options.name,
            transport: Transport.RMQ,
            options: {
              urls: [options.url || getRmqUrl()],
              // Queue trống — publisher không consume, chỉ publish lên exchange
              queue: '',
              exchange,
              exchangeType: 'topic',
              exchangeOptions: { durable: true },
              queueOptions: { durable: true },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }

  /**
   * Build `MicroserviceOptions` cho consumer (Topic Exchange pattern).
   *
   * Dùng ở `main.ts` của service cần NHẬN event.
   * Mỗi service có queue riêng + bind vào exchange bằng routing keys.
   *
   * ```ts
   * // main.ts
   * app.connectMicroservice(
   *   RmqModule.buildConsumerOptions({
   *     queue: 'interaction_queue',
   *     routingKeys: ['user.*'],
   *   }),
   * );
   * ```
   */
  static buildConsumerOptions(options: RmqConsumerOptions): MicroserviceOptions {
    const exchange = options.exchange || MYNOOK_EXCHANGE;
    const routingKeys = options.routingKeys ?? ['#'];

    return {
      transport: Transport.RMQ,
      options: {
        urls: [options.url || getRmqUrl()],
        queue: options.queue,
        exchange,
        exchangeType: 'topic',
        exchangeOptions: { durable: true },
        routingKeys,
        queueOptions: { durable: true },
        noAck: false, // manual ACK — message chỉ xóa khi xử lý xong
      },
    };
  }

  /**
   * @deprecated Dùng `registerPublisher()` thay thế.
   * Giữ lại để backward-compatible — gửi trực tiếp vào queue (không qua exchange).
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
