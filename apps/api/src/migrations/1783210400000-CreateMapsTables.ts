import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `campaign_maps` and `map_points`, and adds the campaign-wide map art
 * direction column.
 */
export class CreateMapsTables1783210400000 implements MigrationInterface {
  name = 'CreateMapsTables1783210400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD COLUMN "map_art_direction" text NOT NULL DEFAULT ''`,
    );

    await queryRunner.query(`
      CREATE TABLE "campaign_maps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "parent_map_id" uuid,
        "created_by_user_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "type" character varying(40) NOT NULL DEFAULT '',
        "short_description" character varying(280) NOT NULL DEFAULT '',
        "description" text NOT NULL DEFAULT '',
        "history" text NOT NULL DEFAULT '',
        "notes" text NOT NULL DEFAULT '',
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "art_direction" text NOT NULL DEFAULT '',
        "image_path" character varying(512),
        "image_url" character varying(1024),
        "image_status" character varying(20) NOT NULL DEFAULT 'none',
        "image_error" text,
        "image_job_id" character varying(128),
        "last_image_prompt" text,
        "last_image_negative_prompt" text,
        "last_image_adjustment" text,
        "display_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_campaign_maps" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_maps_campaign" ON "campaign_maps" ("campaign_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_maps_parent" ON "campaign_maps" ("parent_map_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "map_points" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "map_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "notes" text NOT NULL DEFAULT '',
        "type" character varying(40) NOT NULL DEFAULT '',
        "x" double precision,
        "y" double precision,
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_map_points" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_map_points_map" ON "map_points" ("map_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_map_points_map"`);
    await queryRunner.query(`DROP TABLE "map_points"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_campaign_maps_parent"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_campaign_maps_campaign"`);
    await queryRunner.query(`DROP TABLE "campaign_maps"`);
    await queryRunner.query(
      `ALTER TABLE "campaigns" DROP COLUMN "map_art_direction"`,
    );
  }
}
