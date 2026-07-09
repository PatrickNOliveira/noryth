import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates `characters` and `character_attribute_values`. */
export class CreateCharactersTables1783210200000 implements MigrationInterface {
  name = 'CreateCharactersTables1783210200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "characters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "title" character varying(160) NOT NULL DEFAULT '',
        "short_description" character varying(280) NOT NULL DEFAULT '',
        "description" text NOT NULL DEFAULT '',
        "history" text NOT NULL DEFAULT '',
        "appearance" text NOT NULL DEFAULT '',
        "personality" text NOT NULL DEFAULT '',
        "motivations" text NOT NULL DEFAULT '',
        "secrets" text NOT NULL DEFAULT '',
        "notes" text NOT NULL DEFAULT '',
        "faction_id" uuid,
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "image_path" character varying(512),
        "image_url" character varying(1024),
        "image_status" character varying(20) NOT NULL DEFAULT 'none',
        "image_error" text,
        "image_job_id" character varying(128),
        CONSTRAINT "PK_characters" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_characters_campaign" ON "characters" ("campaign_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "character_attribute_values" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "character_id" uuid NOT NULL,
        "attribute_id" uuid NOT NULL,
        "value" integer NOT NULL,
        CONSTRAINT "PK_character_attribute_values" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_attr_values_character" ON "character_attribute_values" ("character_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_character_attr_values_char_attr" ON "character_attribute_values" ("character_id", "attribute_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_character_attr_values_char_attr"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_character_attr_values_character"`,
    );
    await queryRunner.query(`DROP TABLE "character_attribute_values"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_characters_campaign"`);
    await queryRunner.query(`DROP TABLE "characters"`);
  }
}
