import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the "session scene" columns to `campaign_maps` — a distinct 2.5D
 * isometric game-viewport asset derived from the map, used by the live session
 * screen. It never replaces the original `image_url` (that stays the map's
 * cartographic illustration).
 */
export class AddMapSessionScene1783211000000 implements MigrationInterface {
  name = 'AddMapSessionScene1783211000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" ADD "session_scene_image_path" character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" ADD "session_scene_image_url" character varying(1024)`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" ADD "session_scene_image_status" character varying(20) NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" ADD "session_scene_image_error" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" ADD "session_scene_image_job_id" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" ADD "last_session_scene_prompt" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" ADD "last_session_scene_negative_prompt" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" DROP COLUMN "last_session_scene_negative_prompt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" DROP COLUMN "last_session_scene_prompt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" DROP COLUMN "session_scene_image_job_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" DROP COLUMN "session_scene_image_error"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" DROP COLUMN "session_scene_image_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" DROP COLUMN "session_scene_image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaign_maps" DROP COLUMN "session_scene_image_path"`,
    );
  }
}
