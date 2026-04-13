import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMvpSchema1776000000000 implements MigrationInterface {
  name = 'InitialMvpSchema1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'THERAPIST')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_owner_type_enum" AS ENUM('THERAPIST', 'INSTITUTION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_batch_status_enum" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."voucher_status_enum" AS ENUM('AVAILABLE', 'SENT', 'USED', 'EXPIRED', 'REVOKED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."session_payment_status_enum" AS ENUM('PENDING', 'PAID', 'VOUCHER_REDEEMED')`,
    );

    await queryRunner.query(
      `CREATE TABLE "institutions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "billing_email" character varying,
        "responsible_therapist_user_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_institutions_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'THERAPIST',
        "institution_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "vocational_category" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "categoryId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_vocational_category_categoryId" UNIQUE ("categoryId"),
        CONSTRAINT "PK_vocational_category_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "voucher_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_type" "public"."voucher_owner_type_enum" NOT NULL,
        "owner_user_id" uuid,
        "owner_institution_id" uuid,
        "quantity" integer NOT NULL,
        "unit_price" numeric(10,2) NOT NULL DEFAULT 0,
        "total_price" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'ARS',
        "payment_provider" character varying(50),
        "payment_reference" character varying(255),
        "status" "public"."voucher_batch_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "paid_at" TIMESTAMP,
        CONSTRAINT "CHK_voucher_batches_owner" CHECK (
          ("owner_type" = 'THERAPIST' AND "owner_user_id" IS NOT NULL AND "owner_institution_id" IS NULL) OR
          ("owner_type" = 'INSTITUTION' AND "owner_institution_id" IS NOT NULL)
        ),
        CONSTRAINT "PK_voucher_batches_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id" uuid,
        "patient_name" character varying(255) NOT NULL,
        "session_date" TIMESTAMP NOT NULL,
        "holland_code" character varying(20),
        "total_time_ms" bigint,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "report_url" text,
        "payment_status" "public"."session_payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "voucher_id" uuid,
        "report_unlocked_at" TIMESTAMP,
        "paid_at" TIMESTAMP,
        "payment_reference" character varying(255),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "session_results" (
        "id" SERIAL NOT NULL,
        "category_id" character varying(50) NOT NULL,
        "score" integer NOT NULL,
        "total_possible" integer NOT NULL,
        "percentage" integer NOT NULL,
        "suggested_careers" json,
        "material_snippet" text,
        "session_id" uuid,
        CONSTRAINT "PK_session_results_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_session_results_session_id" ON "session_results" ("session_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "session_swipes" (
        "id" SERIAL NOT NULL,
        "card_id" character varying(50) NOT NULL,
        "category_id" character varying(50) NOT NULL,
        "is_liked" boolean NOT NULL,
        "timestamp" TIMESTAMP NOT NULL,
        "session_id" uuid,
        CONSTRAINT "PK_session_swipes_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_session_swipes_session_id" ON "session_swipes" ("session_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "vouchers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "batch_id" uuid NOT NULL,
        "code" character varying(12) NOT NULL,
        "owner_type" "public"."voucher_owner_type_enum" NOT NULL,
        "owner_user_id" uuid,
        "owner_institution_id" uuid,
        "status" "public"."voucher_status_enum" NOT NULL DEFAULT 'AVAILABLE',
        "assigned_patient_name" character varying(255),
        "assigned_patient_email" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "sent_at" TIMESTAMP,
        "redeemed_session_id" uuid,
        "redeemed_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        CONSTRAINT "UQ_vouchers_code" UNIQUE ("code"),
        CONSTRAINT "CHK_vouchers_owner" CHECK (
          ("owner_type" = 'THERAPIST' AND "owner_user_id" IS NOT NULL AND "owner_institution_id" IS NULL) OR
          ("owner_type" = 'INSTITUTION' AND "owner_institution_id" IS NOT NULL)
        ),
        CONSTRAINT "PK_vouchers_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_vouchers_code" ON "vouchers" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_status" ON "vouchers" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_owner_user_id" ON "vouchers" ("owner_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vouchers_owner_institution_id" ON "vouchers" ("owner_institution_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_batches_owner_user_id" ON "voucher_batches" ("owner_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_voucher_batches_owner_institution_id" ON "voucher_batches" ("owner_institution_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_institution_id" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD CONSTRAINT "FK_institutions_responsible_therapist" FOREIGN KEY ("responsible_therapist_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_voucher_batches_owner_user" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_voucher_batches_owner_institution" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" ADD CONSTRAINT "FK_session_results_session_id" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_swipes" ADD CONSTRAINT "FK_session_swipes_session_id" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_batch_id" FOREIGN KEY ("batch_id") REFERENCES "voucher_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_owner_user" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_owner_institution" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_vouchers_redeemed_session" FOREIGN KEY ("redeemed_session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_sessions_voucher_id" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_voucher_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_redeemed_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_owner_institution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_owner_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_vouchers_batch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_swipes" DROP CONSTRAINT "FK_session_swipes_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" DROP CONSTRAINT "FK_session_results_session_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_voucher_batches_owner_institution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_voucher_batches_owner_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP CONSTRAINT "FK_institutions_responsible_therapist"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_institution_id"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_voucher_batches_owner_institution_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_voucher_batches_owner_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vouchers_owner_institution_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_owner_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vouchers_code"`);
    await queryRunner.query(`DROP TABLE "vouchers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_session_swipes_session_id"`,
    );
    await queryRunner.query(`DROP TABLE "session_swipes"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_session_results_session_id"`,
    );
    await queryRunner.query(`DROP TABLE "session_results"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "voucher_batches"`);
    await queryRunner.query(`DROP TABLE "vocational_category"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "institutions"`);

    await queryRunner.query(`DROP TYPE "public"."session_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."voucher_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."voucher_batch_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."voucher_owner_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
