import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds provenance columns to `characters` for characters improvised during a
 * live session: `creation_source` ('PREPARATION' | 'SESSION') and the optional
 * `created_during_session_id`. Existing rows default to 'PREPARATION' so nothing
 * changes for previously authored characters. This is audit-only — a
 * session-created character is a normal campaign character in every other way.
 */
export class AddCharacterCreationSource1783211700000
  implements MigrationInterface
{
  name = 'AddCharacterCreationSource1783211700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "characters" ADD "creation_source" character varying(20) NOT NULL DEFAULT 'PREPARATION'`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" ADD "created_during_session_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "created_during_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "characters" DROP COLUMN "creation_source"`,
    );
  }
}
