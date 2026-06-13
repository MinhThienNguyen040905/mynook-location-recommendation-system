import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly url = process.env['REDIS_URL'] || '';
  private readonly enabled = process.env['REDIS_ENABLED'] !== 'false' && this.url.length > 0;
  private client: Redis | null = null;
  private unavailableUntil = 0;

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.markUnavailable(error);
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const client = await this.getClient();
    if (!client) return;

    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.markUnavailable(error);
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;

    try {
      await client.del(key);
    } catch (error) {
      this.markUnavailable(error);
    }
  }

  async incrementWithTtl(
    key: string,
    ttlSeconds: number,
  ): Promise<number | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      this.markUnavailable(error);
      return null;
    }
  }

  async ttl(key: string): Promise<number | null> {
    const client = await this.getClient();
    if (!client) return null;

    try {
      return await client.ttl(key);
    } catch (error) {
      this.markUnavailable(error);
      return null;
    }
  }

  private async getClient(): Promise<Redis | null> {
    if (!this.enabled) return null;
    if (Date.now() < this.unavailableUntil) return null;

    if (!this.client) {
      this.client = new Redis(this.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: Number(process.env['REDIS_CONNECT_TIMEOUT_MS'] || 1000),
      });
      this.client.on('error', () => undefined);
    }

    if (this.client.status === 'ready') return this.client;

    try {
      await this.client.connect();
      this.logger.log('Connected to Redis');
      return this.client;
    } catch (error) {
      this.markUnavailable(error);
      return null;
    }
  }

  private markUnavailable(error: unknown): void {
    this.unavailableUntil = Date.now() + 30_000;
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis unavailable, using fallback behavior: ${message}`);
  }
}
