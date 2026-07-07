import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema — creates the `users` table.
 *
 * Mirrors the User entity (BaseEntity: uuid id + audit timestamps). The uuid
 * default relies on the `uuid-ossp` extension, matching TypeORM's
 * `@PrimaryGeneratedColumn('uuid')` behaviour on PostgreSQL.
 */
export class CreateUsersTable1783209600000 implements MigrationInterface {
  name = 'CreateUsersTable1783209600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name" character varying(120) NOT NULL,
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
