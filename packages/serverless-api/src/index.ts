import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule as GatewayModule } from '../../../apps/api-gateway/src/app/app.module';
import { AppModule as AuthModule } from '../../../apps/auth-service/src/app/app.module';
import { AppModule as VenueModule } from '../../../apps/venue-service/src/app/app.module';
import { AppModule as InteractionModule } from '../../../apps/interaction-service/src/app/app.module';
import { AppModule as SearchModule } from '../../../apps/search-ai-service/src/app/app.module';
import type { Request, Response } from 'express';

let ready: Promise<INestApplication> | undefined;

async function bootstrap(): Promise<INestApplication> {
  const apps: INestApplication[] = [];
  try {
    // Separate Nest application contexts preserve gateway authentication and
    // each service's data layer. Internal HTTP listeners are loopback-only;
    // Vercel exposes only the Next.js API handler below.
    for (const [module, port] of [
      [AuthModule, 3002], [VenueModule, 3003],
      [InteractionModule, 3004], [SearchModule, 3005],
    ] as const) {
      const app = await NestFactory.create(module, { logger: ['error', 'warn'], abortOnError: false });
      apps.push(app);
      if (module === AuthModule) app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      await app.listen(port, '127.0.0.1');
    }
    const gateway = await NestFactory.create(GatewayModule, { logger: ['error', 'warn'], abortOnError: false });
    apps.push(gateway);
    gateway.setGlobalPrefix('api');
    await gateway.listen(0, '127.0.0.1');
    return gateway;
  } catch (error) {
    await Promise.allSettled(apps.map(app => app.close()));
    throw error;
  }
}

export async function handler(req: Request, res: Response) {
  try {
    ready ??= bootstrap().catch(error => { ready = undefined; throw error; });
    const gateway = await ready;
    return gateway.getHttpAdapter().getInstance()(req, res);
  } catch (error) {
    // Do not send database credentials or provider errors to the client.
    console.error('MyNook API startup failed:', error instanceof Error ? error.name : 'UnknownError');
    res.status(503).json({ message: 'MyNook is starting up. Please try again shortly.' });
  }
}

export async function readPublicApi(path: string): Promise<globalThis.Response> {
  if (!path.startsWith('/api/')) throw new Error('Expected an API path');
  ready ??= bootstrap().catch(error => { ready = undefined; throw error; });
  const gateway = await ready;
  return fetch(`${await gateway.getUrl()}${path}`, {
    cache: 'no-store', signal: AbortSignal.timeout(30_000),
  });
}
