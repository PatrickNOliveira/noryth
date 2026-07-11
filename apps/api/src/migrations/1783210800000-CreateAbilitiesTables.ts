import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates `ability_definitions` and `character_abilities`. */
export class CreateAbilitiesTables1783210800000 implements MigrationInterface {
  name = 'CreateAbilitiesTables1783210800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "ability_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "proposed_by_user_id" uuid,
        "proposed_for_character_id" uuid,
        "approved_by_user_id" uuid,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "rejected_by_user_id" uuid,
        "rejected_at" TIMESTAMP WITH TIME ZONE,
        "approval_status" character varying(20) NOT NULL DEFAULT 'APPROVED',
        "name" character varying(120) NOT NULL,
        "type" character varying(40) NOT NULL DEFAULT '',
        "short_description" character varying(280) NOT NULL DEFAULT '',
        "description" text NOT NULL DEFAULT '',
        "history" text NOT NULL DEFAULT '',
        "effect_description" text NOT NULL DEFAULT '',
        "rules_text" text NOT NULL DEFAULT '',
        "cost_description" text NOT NULL DEFAULT '',
        "limitation_description" text NOT NULL DEFAULT '',
        "is_unique" boolean NOT NULL DEFAULT false,
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "faction_id" uuid,
        "master_notes" text NOT NULL DEFAULT '',
        "review_notes" text NOT NULL DEFAULT '',
        CONSTRAINT "PK_ability_definitions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_ability_definitions_campaign" ON "ability_definitions" ("campaign_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "character_abilities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_id" uuid NOT NULL,
        "ability_definition_id" uuid NOT NULL,
        "assigned_by_user_id" uuid NOT NULL,
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "status" character varying(20) NOT NULL DEFAULT 'ACTIVE',
        "custom_description" text,
        "master_notes" text NOT NULL DEFAULT '',
        CONSTRAINT "PK_character_abilities" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_abilities_character" ON "character_abilities" ("character_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_character_abilities_definition" ON "character_abilities" ("ability_definition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_character_abilities_definition"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_character_abilities_character"`);
    await queryRunner.query(`DROP TABLE "character_abilities"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ability_definitions_campaign"`);
    await queryRunner.query(`DROP TABLE "ability_definitions"`);
  }
}
