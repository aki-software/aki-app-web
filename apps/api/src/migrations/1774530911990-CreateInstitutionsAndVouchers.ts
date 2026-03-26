import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInstitutionsAndVouchers1774530911990 implements MigrationInterface {
    name = 'CreateInstitutionsAndVouchers1774530911990'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "institutions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "admin_user_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0be7539dcdba335470dc05e9690" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."vouchers_status_enum" AS ENUM('AVAILABLE', 'REDEEMED', 'EXPIRED', 'REVOKED')`);
        await queryRunner.query(`CREATE TABLE "vouchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(12) NOT NULL, "institution_id" uuid NOT NULL, "patient_id" uuid, "status" "public"."vouchers_status_enum" NOT NULL DEFAULT 'AVAILABLE', "report_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "redeemed_at" TIMESTAMP, "expires_at" TIMESTAMP, CONSTRAINT "UQ_efc30b2b9169e05e0e1e19d6dd6" UNIQUE ("code"), CONSTRAINT "PK_ed1b7dd909a696560763acdbc04" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_efc30b2b9169e05e0e1e19d6dd" ON "vouchers" ("code") `);
        await queryRunner.query(`ALTER TABLE "institutions" ADD CONSTRAINT "FK_11ce9a84247507cafce7ef760e6" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_a3901bacdab5ad291addf03a303" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_76bf4e3a72cb46a210e4206df08" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_76bf4e3a72cb46a210e4206df08"`);
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_a3901bacdab5ad291addf03a303"`);
        await queryRunner.query(`ALTER TABLE "institutions" DROP CONSTRAINT "FK_11ce9a84247507cafce7ef760e6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efc30b2b9169e05e0e1e19d6dd"`);
        await queryRunner.query(`DROP TABLE "vouchers"`);
        await queryRunner.query(`DROP TYPE "public"."vouchers_status_enum"`);
        await queryRunner.query(`DROP TABLE "institutions"`);
    }

}
