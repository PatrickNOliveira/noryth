import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds player-character support: control/ownership + attribute-point budget on
 * characters, player notes, and the campaign-level default budget.
 */
export class AddPlayerCharacters1783210600000 implements MigrationInterface {
  name = 'AddPlayerCharacters1783210600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "characters" ADD COLUMN "controlled_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" ADD COLUMN "is_player_character" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" ADD COLUMN "attribute_points_budget" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" ADD COLUMN "player_notes" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_characters_controller" ON "characters" ("controlled_by_user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "campaigns" ADD COLUMN "default_player_character_attribute_points" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campaigns" DROP COLUMN "default_player_character_attribute_points"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_characters_controller"`);
    await queryRunner.query(`ALTER TABLE "characters" DROP COLUMN "player_notes"`);
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "attribute_points_budget"`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "is_player_character"`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "controlled_by_user_id"`,
    );
  }
}
