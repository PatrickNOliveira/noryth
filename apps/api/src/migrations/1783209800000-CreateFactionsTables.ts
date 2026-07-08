import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates the `factions` and `faction_images` tables. */
export class CreateFactionsTables1783209800000 implements MigrationInterface {
  name = 'CreateFactionsTables1783209800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "factions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "type" character varying(60) NOT NULL,
        "description" character varying(500) NOT NULL DEFAULT '',
        "history" text NOT NULL DEFAULT '',
        "identity" text NOT NULL DEFAULT '',
        "member_traits" text NOT NULL DEFAULT '',
        "values" text NOT NULL DEFAULT '',
        "motto" character varying(200) NOT NULL DEFAULT '',
        "colors" character varying(200) NOT NULL DEFAULT '',
        "recurring_elements" text NOT NULL DEFAULT '',
        "symbol_type" character varying(20) NOT NULL,
        "symbol_prompt" text NOT NULL DEFAULT '',
        "approved_image_path" character varying(512),
        "approved_image_url" character varying(1024),
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "created_by" uuid NOT NULL,
        CONSTRAINT "PK_factions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_factions_campaign" ON "factions" ("campaign_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "faction_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "faction_id" uuid NOT NULL,
        "image_path" character varying(512) NOT NULL,
        "image_url" character varying(1024) NOT NULL,
        "prompt" text NOT NULL,
        "negative_prompt" text,
        "notes" text,
        "is_approved" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_faction_images" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_faction_images_faction" ON "faction_images" ("faction_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_faction_images_faction"`);
    await queryRunner.query(`DROP TABLE "faction_images"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_factions_campaign"`);
    await queryRunner.query(`DROP TABLE "factions"`);
  }
}
