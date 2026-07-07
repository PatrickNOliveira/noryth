import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

/**
 * Small strongly-typed accessor over ConfigService.
 *
 * Domain code never reads `process.env` directly — it asks for typed values
 * through this helper, keeping configuration in a single, validated place.
 */
export type TypedConfigService = ConfigService<EnvironmentVariables, true>;

export const isDevelopment = (config: TypedConfigService): boolean =>
  config.get('NODE_ENV', { infer: true }) === 'development';
