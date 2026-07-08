import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@shared/config/env.validation';

/** BullMQ connection options (a subset of ioredis options). */
export interface RedisConnection {
  host: string;
  port: number;
  password?: string;
  db: number;
  /** Required by BullMQ for blocking commands used by workers. */
  maxRetriesPerRequest: null;
}

/**
 * Builds the Redis connection from config, or `null` when REDIS_HOST is empty
 * (queue disabled — async jobs won't run; used for local dev without Redis).
 */
export function buildRedisConnection(
  config: ConfigService<EnvironmentVariables, true>,
): RedisConnection | null {
  const host = config.get('REDIS_HOST', { infer: true });
  if (!host) return null;
  const password = config.get('REDIS_PASSWORD', { infer: true });
  return {
    host,
    port: config.get('REDIS_PORT', { infer: true }),
    password: password || undefined,
    db: config.get('REDIS_DB', { infer: true }),
    maxRetriesPerRequest: null,
  };
}
