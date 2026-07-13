import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the character-resources tables: campaign-level resource DEFINITIONS,
 * per-character STATES (current/max) and per-form max OVERRIDES. Resources are
 * fully dynamic (no HP/mana hardcoded). No rows are back-filled — a campaign
 * without resources is unaffected; states are created as resources/characters
 * are added (and lazily ensured on read).
 */
export class CreateCampaignResources1783212000000
  implements MigrationInterface
{
  name = 'CreateCampaignResources1783212000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "campaign_resource_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "name" character varying(60) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "type" character varying(16) NOT NULL DEFAULT 'POOL',
        "min_value" integer NOT NULL DEFAULT 0,
        "default_max_value" integer NOT NULL,
        "default_current_value_strategy" character varying(16) NOT NULL DEFAULT 'MAX',
        "default_current_value" integer,
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_campaign_resource_definitions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_resource_definitions_campaign" ON "campaign_resource_definitions" ("campaign_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "character_resource_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_id" uuid NOT NULL,
        "resource_definition_id" uuid NOT NULL,
        "current_value" integer NOT NULL,
        "max_value" integer NOT NULL,
        CONSTRAINT "PK_character_resource_states" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_character_resource_state" UNIQUE ("character_id", "resource_definition_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_resource_states_character" ON "character_resource_states" ("character_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "character_form_resource_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_form_id" uuid NOT NULL,
        "resource_definition_id" uuid NOT NULL,
        "max_value" integer NOT NULL,
        CONSTRAINT "PK_character_form_resource_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_character_form_resource_override" UNIQUE ("character_form_id", "resource_definition_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_form_resource_overrides_form" ON "character_form_resource_overrides" ("character_form_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "character_form_resource_overrides"`);
    await queryRunner.query(`DROP TABLE "character_resource_states"`);
    await queryRunner.query(`DROP TABLE "campaign_resource_definitions"`);
  }
}
