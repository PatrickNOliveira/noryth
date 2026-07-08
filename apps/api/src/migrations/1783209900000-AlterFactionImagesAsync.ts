import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adapts `faction_images` for asynchronous generation: a record is created
 * (status "queued") before the job runs, so image fields become nullable and
 * `status` + `error_message` are added.
 */
export class AlterFactionImagesAsync1783209900000 implements MigrationInterface {
  name = 'AlterFactionImagesAsync1783209900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "faction_images" ALTER COLUMN "image_path" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "faction_images" ALTER COLUMN "image_url" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "faction_images" ALTER COLUMN "prompt" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "faction_images" ADD COLUMN "status" character varying(20) NOT NULL DEFAULT 'queued'`,
    );
    await queryRunner.query(
      `ALTER TABLE "faction_images" ADD COLUMN "error_message" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "faction_images" DROP COLUMN "error_message"`);
    await queryRunner.query(`ALTER TABLE "faction_images" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "faction_images" ALTER COLUMN "prompt" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "faction_images" ALTER COLUMN "image_url" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "faction_images" ALTER COLUMN "image_path" SET NOT NULL`,
    );
  }
}
