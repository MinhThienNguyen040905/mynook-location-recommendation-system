import { Injectable, NestMiddleware } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisCacheService } from '@mynook/redis-cache';
import type { NextFunction, Request, Response } from 'express';

interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
  match: (method: string, path: string) => boolean;
}

const RULES: RateLimitRule[] = [
  {
    name: 'voice',
    limit: 10,
    windowSeconds: 60,
    match: (method, path) => method === 'POST' && path === '/api/search/transcribe',
  },
  {
    name: 'auth',
    limit: Number(process.env['RATE_LIMIT_AUTH_LIMIT'] || 10),
    windowSeconds: Number(process.env['RATE_LIMIT_AUTH_WINDOW_SECONDS'] || 300),
    match: (method, path) =>
      method === 'POST' &&
      /^\/api\/auth\/(login|register|forgot-password|reset-password|send-otp|verify-otp)$/.test(
        path,
      ),
  },
  {
    name: 'search',
    limit: Number(process.env['RATE_LIMIT_SEARCH_LIMIT'] || 60),
    windowSeconds: Number(process.env['RATE_LIMIT_SEARCH_WINDOW_SECONDS'] || 60),
    match: (method, path) => method === 'GET' && /^\/api\/search(\/|$)/.test(path),
  },
  {
    name: 'review',
    limit: Number(process.env['RATE_LIMIT_REVIEW_LIMIT'] || 30),
    windowSeconds: Number(process.env['RATE_LIMIT_REVIEW_WINDOW_SECONDS'] || 60),
    match: (method, path) =>
      method === 'POST' &&
      (/^\/api\/reviews$/.test(path) ||
        /^\/api\/reviews\/[^/]+\/(reaction|comments)$/.test(path) ||
        /^\/api\/reports$/.test(path) ||
        /^\/api\/venue-reports$/.test(path)),
  },
  {
    name: 'upload',
    limit: Number(process.env['RATE_LIMIT_UPLOAD_LIMIT'] || 20),
    windowSeconds: Number(process.env['RATE_LIMIT_UPLOAD_WINDOW_SECONDS'] || 600),
    match: (method, path) => method === 'POST' && path === '/api/upload',
  },
];

@Injectable()
export class RedisRateLimitMiddleware implements NestMiddleware {
  // Serverless demos may not have Redis. Keep a bounded per-instance fallback.
  private readonly localLimits = new Map<string, { count: number; expiresAt: number }>();
  constructor(private readonly redis: RedisCacheService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = new URL(req.originalUrl, 'http://localhost').pathname;
    const method = req.method.toUpperCase();
    const rule = RULES.find((candidate) => candidate.match(method, path));
    if (!rule) return next();

    const identity = this.identity(req);
    const key = `mynook:rate-limit:${rule.name}:${identity}`;
    const redisCount = await this.redis.incrementWithTtl(key, rule.windowSeconds);
    const now = Date.now();
    let local = this.localLimits.get(key);
    if (redisCount === null) {
      if (!local || local.expiresAt <= now) {
        for (const [entryKey, entry] of this.localLimits) {
          if (entry.expiresAt <= now) this.localLimits.delete(entryKey);
        }
        if (this.localLimits.size >= 10_000) {
          res.setHeader('Retry-After', String(rule.windowSeconds));
          res.status(429).json({ message: 'Please try again later.' });
          return;
        }
        local = { count: 0, expiresAt: now + rule.windowSeconds * 1000 };
        this.localLimits.set(key, local);
      }
      local.count++;
    }
    const count = redisCount ?? local!.count;

    const remaining = Math.max(rule.limit - count, 0);
    res.setHeader('X-RateLimit-Limit', String(rule.limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Window', String(rule.windowSeconds));

    if (count <= rule.limit) return next();

    const ttl = redisCount === null
      ? Math.ceil((local!.expiresAt - now) / 1000)
      : await this.redis.ttl(key);
    const retryAfter = ttl && ttl > 0 ? ttl : rule.windowSeconds;
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      message: 'Too many requests. Please try again later.',
      retry_after_seconds: retryAfter,
    });
  }

  private identity(req: Request): string {
    const authorization = req.header('authorization');
    if (authorization?.startsWith('Bearer ')) {
      return `user-token:${this.hash(authorization.slice('Bearer '.length))}`;
    }

    const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
    return `ip:${this.hash(forwarded || req.ip || 'unknown')}`;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('base64url').slice(0, 32);
  }
}
