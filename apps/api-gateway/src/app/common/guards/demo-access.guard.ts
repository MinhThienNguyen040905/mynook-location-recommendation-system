import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DEMO_ACCOUNTS, DEMO_VENUE_ID, isDemoAccount } from '@mynook/shared-types';
import type { Request } from 'express';

@Injectable()
export class DemoAccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return true; // Existing route guards authenticate protected APIs.
    let payload: { sub: string; demo?: boolean };
    try { payload = this.jwt.verify(token); } catch { return true; }
    if (!payload.demo && !isDemoAccount(payload.sub)) return true;

    const path = decodeURIComponent(new URL(req.originalUrl, 'http://localhost').pathname).replace(/\/+$/, '').toLowerCase();
    const method = req.method.toUpperCase();
    if (method === 'POST' && ['/api/auth/demo', '/api/auth/refresh'].includes(path)) return true;
    if (process.env['DEMO_ENABLED'] !== 'true') throw new ForbiddenException('Chế độ dùng thử đã tắt.');
    if (path.startsWith('/api/admin')) throw new ForbiddenException('Tài khoản dùng thử không có quyền quản trị.');
    if (/^\/api\/interactions\/venues\/[^/]+\/analytics$/.test(path) &&
        path !== `/api/interactions/venues/${DEMO_VENUE_ID}/analytics`) {
      throw new ForbiddenException('Chỉ xem thống kê của quán mẫu trong chế độ dùng thử.');
    }
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
    if (['POST', 'DELETE'].includes(method) && /^\/api\/favorites(?:\/[0-9a-f-]{36})?$/.test(path)) return true;
    if (method === 'POST' && path === '/api/search/transcribe') return true;
    if (method === 'POST' && path === '/api/reviews' && payload.sub === DEMO_ACCOUNTS.customer.id &&
        req.body?.venue_id === DEMO_VENUE_ID && (!req.body?.media || (Array.isArray(req.body.media) && req.body.media.length === 0))) return true;
    throw new ForbiddenException('Chế độ dùng thử cho phép lưu yêu thích và viết đánh giá tại quán mẫu. Dashboard chủ quán chỉ xem; thay đổi dữ liệu khác và tải tệp đã được khóa.');
  }
}
