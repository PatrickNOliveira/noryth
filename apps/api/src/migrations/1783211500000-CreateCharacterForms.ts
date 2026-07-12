import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the character forms tables and back-fills a "Forma Padrão" for every
 * existing character (mirroring its current appearance/image), so nothing breaks.
 */
export class CreateCharacterForms1783211500000 implements MigrationInterface {
  name = 'CreateCharacterForms1783211500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "character_forms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "short_description" character varying(280) NOT NULL DEFAULT '',
        "appearance_description" text NOT NULL DEFAULT '',
        "notes" text NOT NULL DEFAULT '',
        "is_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT false,
        "uses_base_abilities" boolean NOT NULL DEFAULT true,
        "image_path" character varying(512),
        "image_url" character varying(1024),
        "image_status" character varying(20) NOT NULL DEFAULT 'none',
        "image_error" text,
        "image_job_id" character varying(128),
        "last_image_prompt" text,
        "last_image_negative_prompt" text,
        CONSTRAINT "PK_character_forms" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_forms_character" ON "character_forms" ("character_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "character_form_attribute_values" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_form_id" uuid NOT NULL,
        "attribute_id" uuid NOT NULL,
        "value" integer NOT NULL,
        CONSTRAINT "PK_character_form_attribute_values" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_character_form_attr_value" UNIQUE ("character_form_id", "attribute_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_form_attr_values_form" ON "character_form_attribute_values" ("character_form_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "character_form_abilities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_form_id" uuid NOT NULL,
        "ability_definition_id" uuid NOT NULL,
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_character_form_abilities" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_character_form_ability" UNIQUE ("character_form_id", "ability_definition_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_form_abilities_form" ON "character_form_abilities" ("character_form_id")`,
    );

    // Back-fill a default+active form for every existing character.
    await queryRunner.query(`
      INSERT INTO "character_forms"
        ("campaign_id", "character_id", "created_by_user_id", "name",
         "short_description", "appearance_description", "is_default", "is_active",
         "uses_base_abilities", "image_path", "image_url", "image_status")
      SELECT
        c."campaign_id", c."id", c."created_by_user_id", 'Forma Padrão',
        c."short_description", c."appearance", true, true,
        true, c."image_path", c."image_url", c."image_status"
      FROM "characters" c
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "character_form_abilities"`);
    await queryRunner.query(`DROP TABLE "character_form_attribute_values"`);
    await queryRunner.query(`DROP TABLE "character_forms"`);
  }
}
