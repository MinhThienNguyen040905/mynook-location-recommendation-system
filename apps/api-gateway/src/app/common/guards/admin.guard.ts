import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AccountType } from '@mynook/shared-types';

/**
 * Guard yêu cầu user phải có `type = admin`. Phải đặt SAU JwtAuthGuard.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request['user'] as { type?: string } | undefined;

    if (!user || user.type !== AccountType.ADMIN) {
      throw new ForbiddenException('Chỉ admin mới có quyền truy cập');
    }
    return true;
  }
}
