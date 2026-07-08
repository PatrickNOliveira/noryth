import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates the `campaign_attributes` table (per-campaign character attributes). */
export class CreateCampaignAttributesTable1783210000000
  implements MigrationInterface
{
  name = 'CreateCampaignAttributesTable1783210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "campaign_attributes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "campaign_id" uuid NOT NULL,
        "name" character varying(60) NOT NULL,
        "min_value" integer NOT NULL,
        "max_value" integer NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_campaign_attributes" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_attributes_campaign" ON "campaign_attributes" ("campaign_id")`,
    );

    // Attribute names are unique per campaign, case-insensitively. Different
    // campaigns may reuse the same name freely.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_campaign_attributes_campaign_name" ON "campaign_attributes" ("campaign_id", LOWER("name"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_campaign_attributes_campaign_name"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_campaign_attributes_campaign"`,
    );
    await queryRunner.query(`DROP TABLE "campaign_attributes"`);
  }
}
