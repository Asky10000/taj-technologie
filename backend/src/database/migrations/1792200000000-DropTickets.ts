import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Supprime définitivement le module Tickets (SAV) : tables et types enum.
 * CASCADE retire au passage les contraintes de clés étrangères et index liés.
 */
export class DropTickets1792200000000 implements MigrationInterface {
  name = 'DropTickets1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_comments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets" CASCADE`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tickets_source_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tickets_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tickets_priority_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tickets_status_enum"`,
    );
  }

  // Suppression volontaire et définitive — pas de rollback du schéma Tickets.
  public async down(): Promise<void> {
    // no-op
  }
}
