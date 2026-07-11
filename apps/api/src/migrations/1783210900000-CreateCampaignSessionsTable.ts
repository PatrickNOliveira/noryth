import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates `campaign_sessions` (the live/active session of a campaign). */
export class CreateCampaignSessionsTable1783210900000
  implements MigrationInterface
{
  name = 'CreateCampaignSessionsTable1783210900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "campaign_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "started_by_user_id" uuid NOT NULL,
        "initial_map_id" uuid NOT NULL,
        "current_map_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'ACTIVE',
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_campaign_sessions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_sessions_campaign" ON "campaign_sessions" ("campaign_id")`,
    );
    // At most one ACTIVE session per campaign — a partial unique index enforces
    // it at the database level, complementing the service-side guard.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_campaign_sessions_one_active" ON "campaign_sessions" ("campaign_id") WHERE "status" = 'ACTIVE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_campaign_sessions_one_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_campaign_sessions_campaign"`);
    await queryRunner.query(`DROP TABLE "campaign_sessions"`);
  }
}
