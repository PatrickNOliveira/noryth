import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds `ended_by_user_id` to `campaign_sessions` (who ended the session). */
export class AddSessionEndedBy1783211400000 implements MigrationInterface {
  name = 'AddSessionEndedBy1783211400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campaign_sessions" ADD "ended_by_user_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campaign_sessions" DROP COLUMN "ended_by_user_id"`,
    );
  }
}
