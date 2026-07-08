import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `campaign_participants` (campaign membership) and backfills a row for
 * every existing campaign's owner and master, so campaigns created before this
 * story still show up in "my campaigns" (now driven by membership).
 */
export class CreateCampaignParticipantsTable1783210100000
  implements MigrationInterface
{
  name = 'CreateCampaignParticipantsTable1783210100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "campaign_participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_campaign_participants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_participants_campaign" ON "campaign_participants" ("campaign_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_campaign_participants_campaign_user" ON "campaign_participants" ("campaign_id", "user_id")`,
    );

    // Backfill: every existing campaign's owner (and master, if different) gets
    // a membership row keyed on the campaign's creation time.
    await queryRunner.query(`
      INSERT INTO "campaign_participants" ("campaign_id", "user_id", "joined_at")
      SELECT "id", "owner_id", "created_at" FROM "campaigns"
      UNION
      SELECT "id", "master_id", "created_at" FROM "campaigns"
      ON CONFLICT ("campaign_id", "user_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_campaign_participants_campaign_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_campaign_participants_campaign"`,
    );
    await queryRunner.query(`DROP TABLE "campaign_participants"`);
  }
}
