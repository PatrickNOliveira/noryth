import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates `character_form_session_sprites` (per-form, per-direction map sprite). */
export class CreateCharacterFormSessionSprites1783211600000
  implements MigrationInterface
{
  name = 'CreateCharacterFormSessionSprites1783211600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "character_form_session_sprites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_id" uuid NOT NULL,
        "character_form_id" uuid NOT NULL,
        "direction" character varying(16) NOT NULL,
        "image_path" character varying(512),
        "image_url" character varying(1024),
        "image_status" character varying(20) NOT NULL DEFAULT 'none',
        "image_error" text,
        "image_job_id" character varying(128),
        "last_prompt" text,
        "last_negative_prompt" text,
        CONSTRAINT "PK_character_form_session_sprites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_character_form_sprite_direction" UNIQUE ("character_form_id", "direction")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_form_sprites_form" ON "character_form_session_sprites" ("character_form_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_character_form_sprites_character" ON "character_form_session_sprites" ("character_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_character_form_sprites_character"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_character_form_sprites_form"`);
    await queryRunner.query(`DROP TABLE "character_form_session_sprites"`);
  }
}
