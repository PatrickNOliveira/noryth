import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EnvironmentVariables } from './env.validation';

/**
 * Builds TypeORM options from validated configuration.
 *
 * `synchronize` is permanently OFF — the schema evolves EXCLUSIVELY through
 * migrations, in every environment. Pending migrations are applied on boot.
 */
export function buildTypeOrmOptions(
  config: ConfigService<EnvironmentVariables, true>,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get('DATABASE_HOST', { infer: true }),
    port: config.get('DATABASE_PORT', { infer: true }),
    username: config.get('DATABASE_USER', { infer: true }),
    password: config.get('DATABASE_PASSWORD', { infer: true }),
    database: config.get('DATABASE_NAME', { infer: true }),
    autoLoadEntities: true,
    synchronize: false,
    migrations: [__dirname + '/../../migrations/*.{ts,js}'],
    migrationsRun: true,
  };
}
