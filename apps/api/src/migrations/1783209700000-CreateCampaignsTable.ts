import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `campaigns` table — the first real domain entity of Noryth.
 * Mirrors the Campaign entity (BaseEntity: uuid id + audit timestamps).
 */
export class CreateCampaignsTable1783209700000 implements MigrationInterface {
  name = 'CreateCampaignsTable1783209700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "campaigns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "owner_id" uuid NOT NULL,
        "master_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "theme" character varying(120) NOT NULL,
        "short_description" character varying(280) NOT NULL,
        "premise" text NOT NULL,
        "tone" character varying(120) NOT NULL,
        "main_language" character varying(16) NOT NULL,
        "visibility" character varying(16) NOT NULL,
        "password_hash" character varying(255),
        "max_players" integer,
        "cover_image_path" character varying(512),
        "cover_image_url" character varying(1024),
        "status" character varying(16) NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_campaigns" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_owner" ON "campaigns" ("owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_campaigns_owner"`);
    await queryRunner.query(`DROP TABLE "campaigns"`);
  }
}
