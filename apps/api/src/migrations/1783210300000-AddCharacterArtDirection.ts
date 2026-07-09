import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the campaign-level character art direction and the character's
 * last-image prompt/adjustment audit columns.
 */
export class AddCharacterArtDirection1783210300000
  implements MigrationInterface
{
  name = 'AddCharacterArtDirection1783210300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD COLUMN "character_art_direction" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" ADD COLUMN "last_image_prompt" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" ADD COLUMN "last_image_negative_prompt" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" ADD COLUMN "last_image_adjustment" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "last_image_adjustment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "last_image_negative_prompt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "last_image_prompt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" DROP COLUMN "character_art_direction"`,
    );
  }
}
