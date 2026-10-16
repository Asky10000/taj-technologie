import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInterventions1792145328474 implements MigrationInterface {
    name = 'AddInterventions1792145328474'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."interventions_status_enum" AS ENUM('DRAFT', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "interventions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "number" character varying(30) NOT NULL, "subject" character varying(300), "status" "public"."interventions_status_enum" NOT NULL DEFAULT 'DRAFT', "visit_date" TIMESTAMP WITH TIME ZONE NOT NULL, "anomalies" text, "observations" text, "suggestions" text, "customer_id" uuid NOT NULL, "technician_id" uuid, CONSTRAINT "UQ_d1ad4e681b65e4a0c9d2387774b" UNIQUE ("number"), CONSTRAINT "PK_39babe074cbaa90750582bfc38d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_interventions_status" ON "interventions" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_interventions_customer" ON "interventions" ("customer_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_interventions_number" ON "interventions" ("number") `);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_9657ac9203a3a1f6574d372db2d" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interventions" ADD CONSTRAINT "FK_0b0053b93f4d32aab268fe2451e" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_0b0053b93f4d32aab268fe2451e"`);
        await queryRunner.query(`ALTER TABLE "interventions" DROP CONSTRAINT "FK_9657ac9203a3a1f6574d372db2d"`);
        await queryRunner.query(`DROP INDEX "public"."idx_interventions_number"`);
        await queryRunner.query(`DROP INDEX "public"."idx_interventions_customer"`);
        await queryRunner.query(`DROP INDEX "public"."idx_interventions_status"`);
        await queryRunner.query(`DROP TABLE "interventions"`);
        await queryRunner.query(`DROP TYPE "public"."interventions_status_enum"`);
    }

}
