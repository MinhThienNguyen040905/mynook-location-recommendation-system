import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  role: string;
}

/**
 * Parameter decorator for downstream microservice controllers.
 *
 * Reads `x-user-id` and `x-user-role` headers (set by API Gateway after
 * JWT verification) and returns a `CurrentUserPayload` object.
 *
 * Usage:
 * ```ts
 * @Get('profile')
 * getProfile(@CurrentUser() user: CurrentUserPayload) {
 *   // user.id   — the authenticated user's ID
 *   // user.role — the authenticated user's role
 * }
 * ```
 *
 * NOTE: This decorator does NOT import or depend on any JWT library.
 * Authentication is handled exclusively at the API Gateway level.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return {
      id: request.headers['x-user-id'] as string,
      role: request.headers['x-user-role'] as string,
    };
  },
);
