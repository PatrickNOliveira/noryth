import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds provenance columns to `item_definitions` for items improvised during a
 * live session: `creation_source` ('PREPARATION' | 'SESSION') and the optional
 * `created_during_session_id`. Existing rows default to 'PREPARATION'. Audit-only
 * — a session-created item is a normal campaign item in every other way.
 */
export class AddItemCreationSource1783211800000 implements MigrationInterface {
  name = 'AddItemCreationSource1783211800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "item_definitions" ADD "creation_source" character varying(20) NOT NULL DEFAULT 'PREPARATION'`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_definitions" ADD "created_during_session_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "item_definitions" DROP COLUMN "created_during_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_definitions" DROP COLUMN "creation_source"`,
    );
  }
}
