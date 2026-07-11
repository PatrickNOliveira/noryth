import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates `item_definitions` and `item_instances`, plus the item art direction. */
export class CreateItemsTables1783210700000 implements MigrationInterface {
  name = 'CreateItemsTables1783210700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD COLUMN "item_art_direction" text NOT NULL DEFAULT ''`,
    );

    await queryRunner.query(`
      CREATE TABLE "item_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "type" character varying(40) NOT NULL DEFAULT '',
        "short_description" character varying(280) NOT NULL DEFAULT '',
        "description" text NOT NULL DEFAULT '',
        "history" text NOT NULL DEFAULT '',
        "appearance" text NOT NULL DEFAULT '',
        "effect_description" text NOT NULL DEFAULT '',
        "rules_text" text NOT NULL DEFAULT '',
        "is_unique" boolean NOT NULL DEFAULT false,
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "master_notes" text NOT NULL DEFAULT '',
        "image_path" character varying(512),
        "image_url" character varying(1024),
        "image_status" character varying(20) NOT NULL DEFAULT 'none',
        "image_error" text,
        "image_job_id" character varying(128),
        "last_image_prompt" text,
        "last_image_negative_prompt" text,
        "last_image_adjustment" text,
        CONSTRAINT "PK_item_definitions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_item_definitions_campaign" ON "item_definitions" ("campaign_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "item_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "item_definition_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "custom_name" character varying(160),
        "custom_description" text,
        "quantity" integer NOT NULL DEFAULT 1,
        "state" character varying(20) NOT NULL DEFAULT 'AVAILABLE',
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "discovered_at" TIMESTAMP WITH TIME ZONE,
        "holder_character_id" uuid,
        "map_id" uuid,
        "map_point_of_interest_id" uuid,
        "master_notes" text NOT NULL DEFAULT '',
        CONSTRAINT "PK_item_instances" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_item_instances_campaign" ON "item_instances" ("campaign_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_item_instances_definition" ON "item_instances" ("item_definition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_item_instances_definition"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_instances_campaign"`);
    await queryRunner.query(`DROP TABLE "item_instances"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_item_definitions_campaign"`);
    await queryRunner.query(`DROP TABLE "item_definitions"`);
    await queryRunner.query(
      `ALTER TABLE "campaigns" DROP COLUMN "item_art_direction"`,
    );
  }
}
