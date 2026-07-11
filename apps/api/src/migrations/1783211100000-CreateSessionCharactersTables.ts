import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates `character_session_sprites` and `session_characters`. */
export class CreateSessionCharactersTables1783211100000
  implements MigrationInterface
{
  name = 'CreateSessionCharactersTables1783211100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "character_session_sprites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "character_id" uuid NOT NULL,
        "direction" character varying(16) NOT NULL,
        "image_path" character varying(512),
        "image_url" character varying(1024),
        "image_status" character varying(20) NOT NULL DEFAULT 'none',
        "image_error" text,
        "image_job_id" character varying(128),
        "last_prompt" text,
        "last_negative_prompt" text,
        CONSTRAINT "PK_character_session_sprites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_character_session_sprite_direction" UNIQUE ("character_id", "direction")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_character_session_sprites_character" ON "character_session_sprites" ("character_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "session_characters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "session_id" uuid NOT NULL,
        "map_id" uuid NOT NULL,
        "character_id" uuid NOT NULL,
        "x" double precision NOT NULL DEFAULT 50,
        "y" double precision NOT NULL DEFAULT 50,
        "facing" character varying(16) NOT NULL DEFAULT 'FRONT',
        "is_visible_to_players" boolean NOT NULL DEFAULT false,
        "created_by_user_id" uuid NOT NULL,
        "updated_by_user_id" uuid NOT NULL,
        CONSTRAINT "PK_session_characters" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_session_characters_session" ON "session_characters" ("session_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_session_characters_map" ON "session_characters" ("map_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_session_characters_map"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_session_characters_session"`);
    await queryRunner.query(`DROP TABLE "session_characters"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_character_session_sprites_character"`,
    );
    await queryRunner.query(`DROP TABLE "character_session_sprites"`);
  }
}
