import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Shape of the authenticated principal attached to the request by the JWT
 * strategy. Kept minimal and free of persistence concerns.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Injects the authenticated user into a controller handler:
 *
 *   getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
