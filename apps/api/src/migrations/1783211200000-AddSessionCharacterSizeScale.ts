import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `size_scale` to `session_characters` — the per-token visual scale on the
 * session map. Existing rows get the default so nothing breaks.
 */
export class AddSessionCharacterSizeScale1783211200000
  implements MigrationInterface
{
  name = 'AddSessionCharacterSizeScale1783211200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session_characters" ADD "size_scale" double precision NOT NULL DEFAULT 0.35`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session_characters" DROP COLUMN "size_scale"`,
    );
  }
}
