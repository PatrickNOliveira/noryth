import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds provenance columns to `ability_definitions` for abilities improvised
 * during a live session: `creation_source` ('PREPARATION' | 'SESSION') and the
 * optional `created_during_session_id`. Existing rows default to 'PREPARATION'.
 * Audit-only — a session-created ability is a normal campaign ability otherwise.
 */
export class AddAbilityCreationSource1783211900000
  implements MigrationInterface
{
  name = 'AddAbilityCreationSource1783211900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ability_definitions" ADD "creation_source" character varying(20) NOT NULL DEFAULT 'PREPARATION'`,
    );
    await queryRunner.query(
      `ALTER TABLE "ability_definitions" ADD "created_during_session_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ability_definitions" DROP COLUMN "created_during_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ability_definitions" DROP COLUMN "creation_source"`,
    );
  }
}
