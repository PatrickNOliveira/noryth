import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds `show_label_on_map` to map points (deterministic label overlay). */
export class AddMapPointShowLabel1783210500000 implements MigrationInterface {
  name = 'AddMapPointShowLabel1783210500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "map_points" ADD COLUMN "show_label_on_map" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "map_points" DROP COLUMN "show_label_on_map"`,
    );
  }
}
