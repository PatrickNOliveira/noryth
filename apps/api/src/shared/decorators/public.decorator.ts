import { SetMetadata } from '@nestjs/common';

/** Metadata key marking a route as publicly accessible (no JWT required). */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as public so the global JWT guard skips it.
 *
 *   @Public()
 *   @Post('login')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
