import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Builds the x-user-id / x-user-role headers object from an authenticated user.
 * Use this in gateway controllers when forwarding requests to downstream services.
 */
export function buildUserHeaders(user: AuthenticatedUser): {
  'x-user-id': string;
  'x-user-role': string;
} {
  return {
    'x-user-id': user.userId,
    'x-user-role': user.role,
  };
}

/**
 * Interceptor that attaches the authenticated user's info to the request
 * object as `req.authHeaders` for convenient access in controllers.
 *
 * After JwtAuthGuard verifies the token and populates `req.user`, this
 * interceptor pre-computes the downstream headers so controllers can simply
 * spread `req.authHeaders` into their Axios calls.
 */
@Injectable()
export class AuthHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request['user'] as AuthenticatedUser | undefined;

    if (user) {
      request['authHeaders'] = buildUserHeaders(user);
    }

    return next.handle();
  }
}
