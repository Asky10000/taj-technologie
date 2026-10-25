import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAllowedModules1792700000000
  implements MigrationInterface
{
  name = 'AddUserAllowedModules1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "allowed_modules" text array`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "allowed_modules"`,
    );
  }
}
