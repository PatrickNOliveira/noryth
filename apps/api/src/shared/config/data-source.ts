import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';

/**
 * Standalone DataSource used by the TypeORM CLI for migration commands.
 * The running application configures TypeORM through `buildTypeOrmOptions`.
 */
loadEnv();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'noryth',
  password: process.env.DATABASE_PASSWORD ?? 'noryth',
  database: process.env.DATABASE_NAME ?? 'noryth',
  entities: [__dirname + '/../../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../../migrations/*.{ts,js}'],
  synchronize: false,
});
