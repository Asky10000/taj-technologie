import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPayments1792517212906 implements MigrationInterface {
    name = 'AddPayments1792517212906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('CASH', 'BANK_TRANSFER', 'CHECK', 'CARD', 'MOBILE_MONEY', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "amount" numeric(14,2) NOT NULL, "payment_method" "public"."payments_payment_method_enum", "reference" character varying(200), "paid_at" TIMESTAMP WITH TIME ZONE NOT NULL, "proof_url" character varying(500), "invoice_id" uuid, "purchase_order_id" uuid, "created_by_id" uuid, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_payments_purchase_order" ON "payments" ("purchase_order_id") `);
        await queryRunner.query(`CREATE INDEX "idx_payments_invoice" ON "payments" ("invoice_id") `);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_563a5e248518c623eebd987d43e" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_1b4ff8921d1ebe0a7c79c74dbe1" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_6a01849dbd3e28beb83ec16b577" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_6a01849dbd3e28beb83ec16b577"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_1b4ff8921d1ebe0a7c79c74dbe1"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_563a5e248518c623eebd987d43e"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_invoice"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payments_purchase_order"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_payment_method_enum"`);
    }

}
