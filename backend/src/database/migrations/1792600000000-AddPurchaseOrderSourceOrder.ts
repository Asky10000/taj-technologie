import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderSourceOrder1792600000000
  implements MigrationInterface
{
  name = 'AddPurchaseOrderSourceOrder1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD "source_order_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_po_source_order" ON "purchase_orders" ("source_order_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_po_source_order" FOREIGN KEY ("source_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP CONSTRAINT "FK_po_source_order"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_po_source_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" DROP COLUMN "source_order_id"`,
    );
  }
}
