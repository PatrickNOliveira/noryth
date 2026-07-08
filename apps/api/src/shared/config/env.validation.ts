import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Typed and validated environment schema.
 *
 * The application refuses to boot when a required variable is missing or
 * malformed — configuration errors surface at startup, never at runtime.
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT = 3333;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  DATABASE_PORT = 5432;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER!: string;

  @IsString()
  DATABASE_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN = '7d';

  @IsString()
  WEB_ORIGIN = 'http://localhost:3000';

  // ── Storage (MinIO) ────────────────────────────────────────
  @IsString()
  STORAGE_DRIVER = 'minio';

  @IsString()
  MINIO_ENDPOINT = 'localhost';

  @IsInt()
  @Min(0)
  @Max(65535)
  MINIO_PORT = 9000;

  @IsString()
  MINIO_ACCESS_KEY = 'minioadmin';

  @IsString()
  MINIO_SECRET_KEY = 'minioadmin';

  @IsString()
  MINIO_BUCKET = 'noryth';

  @IsBoolean()
  MINIO_USE_SSL = false;

  /** Public base URL for objects (e.g. behind a CDN/proxy). Empty = derive. */
  @IsString()
  MINIO_PUBLIC_URL = '';

  // ── AI image generation (OpenAI) ───────────────────────────
  /** Empty = image generation disabled (factions saved without a symbol). */
  @IsString()
  OPENAI_API_KEY = '';

  @IsString()
  OPENAI_IMAGE_MODEL = 'gpt-image-1';

  @IsString()
  OPENAI_IMAGE_SIZE = '1024x1024';

  /** Chat model used by the FactionSymbolAgent to turn lore into a visual prompt. */
  @IsString()
  OPENAI_TEXT_MODEL = 'gpt-4o-mini';

  // ── Queue (Redis / BullMQ) ─────────────────────────────────
  /** Empty = queue disabled (async jobs won't run). BullMQ requires Redis. */
  @IsString()
  REDIS_HOST = '';

  @IsInt()
  @Min(0)
  @Max(65535)
  REDIS_PORT = 6379;

  @IsString()
  REDIS_PASSWORD = '';

  @IsInt()
  @Min(0)
  REDIS_DB = 0;
}

const TRUE_VALUES = new Set(['true', '1', 'yes']);

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const toNumber = (v: unknown, fallback: number) =>
    v === undefined || v === '' ? fallback : Number(v);

  const validated = plainToInstance(
    EnvironmentVariables,
    {
      ...config,
      PORT: toNumber(config.PORT, 3333),
      DATABASE_PORT: toNumber(config.DATABASE_PORT, 5432),
      MINIO_PORT: toNumber(config.MINIO_PORT, 9000),
      MINIO_USE_SSL: TRUE_VALUES.has(String(config.MINIO_USE_SSL ?? 'false')),
      REDIS_PORT: toNumber(config.REDIS_PORT, 6379),
      REDIS_DB: toNumber(config.REDIS_DB, 0),
    },
    { enableImplicitConversion: false },
  );

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return validated;
}
