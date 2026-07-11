import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `scene_x` / `scene_y` to `map_points` — the point's position on the 2.5D
 * session scene (independent of the cartographic x/y). Nullable: null falls back
 * to x/y at render time.
 */
export class AddMapPointScenePosition1783211300000
  implements MigrationInterface
{
  name = 'AddMapPointScenePosition1783211300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "map_points" ADD "scene_x" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "map_points" ADD "scene_y" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "map_points" DROP COLUMN "scene_y"`);
    await queryRunner.query(`ALTER TABLE "map_points" DROP COLUMN "scene_x"`);
  }
}
