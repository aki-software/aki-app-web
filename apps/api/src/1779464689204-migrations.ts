import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1779464689204 implements MigrationInterface {
    name = 'Migrations1779464689204'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_metrics" ("session_id" uuid NOT NULL, "total_duration_ms" bigint NOT NULL, "total_swipes" integer NOT NULL, "unique_cards" integer NOT NULL, "reverted_matches" integer NOT NULL, "avg_time_between_swipes_ms" integer NOT NULL, "min_time_between_swipes_ms" integer NOT NULL, "max_time_between_swipes_ms" integer NOT NULL, "reliability_score" numeric(5,2) NOT NULL, "reliability_level" character varying(20) NOT NULL, "calculated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_82f41dc4d58d4f608f65b077308" PRIMARY KEY ("session_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'THERAPIST', 'INSTITUTION_ADMIN', 'PATIENT')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "password_setup_token" character varying(255), "password_setup_expires_at" TIMESTAMP, "password_set_at" TIMESTAMP, "password_reset_token" character varying(255), "password_reset_expires_at" TIMESTAMP, "role" "public"."users_role_enum" NOT NULL DEFAULT 'THERAPIST', "institution_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "institutions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "billing_email" character varying, "responsible_therapist_user_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0be7539dcdba335470dc05e9690" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."voucher_batches_owner_type_enum" AS ENUM('THERAPIST', 'INSTITUTION')`);
        await queryRunner.query(`CREATE TYPE "public"."voucher_batches_status_enum" AS ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED')`);
        await queryRunner.query(`CREATE TABLE "voucher_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_type" "public"."voucher_batches_owner_type_enum" NOT NULL, "owner_user_id" uuid, "owner_institution_id" uuid, "quantity" integer NOT NULL, "unit_price" numeric(10,2) NOT NULL DEFAULT '0', "total_price" numeric(10,2) NOT NULL DEFAULT '0', "currency" character varying(3) NOT NULL DEFAULT 'ARS', "payment_provider" character varying(50), "payment_reference" character varying(255), "status" "public"."voucher_batches_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "paid_at" TIMESTAMP, CONSTRAINT "PK_a5493de087a57e93616f744f35a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."vouchers_owner_type_enum" AS ENUM('THERAPIST', 'INSTITUTION')`);
        await queryRunner.query(`CREATE TYPE "public"."vouchers_status_enum" AS ENUM('AVAILABLE', 'SENT', 'USED', 'EXPIRED', 'REVOKED')`);
        await queryRunner.query(`CREATE TABLE "vouchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(8) NOT NULL, "batch_id" uuid NOT NULL, "owner_type" "public"."vouchers_owner_type_enum" NOT NULL, "owner_user_id" uuid, "owner_institution_id" uuid, "status" "public"."vouchers_status_enum" NOT NULL DEFAULT 'AVAILABLE', "assigned_patient_name" character varying(255), "assigned_patient_email" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "sent_at" TIMESTAMP, "redeemed_session_id" uuid, "redeemed_at" TIMESTAMP, "expires_at" TIMESTAMP, CONSTRAINT "UQ_efc30b2b9169e05e0e1e19d6dd6" UNIQUE ("code"), CONSTRAINT "PK_ed1b7dd909a696560763acdbc04" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_efc30b2b9169e05e0e1e19d6dd" ON "vouchers" ("code") `);
        await queryRunner.query(`CREATE TYPE "public"."sessions_payment_status_enum" AS ENUM('PENDING', 'PAID', 'VOUCHER_REDEEMED')`);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "therapist_user_id" uuid, "institution_id" uuid, "patient_id" uuid, "patient_name" character varying(255) NOT NULL, "session_date" TIMESTAMP NOT NULL, "sync_key" character varying(128), "holland_code" character varying(20), "total_time_ms" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "report_url" text, "payment_status" "public"."sessions_payment_status_enum" NOT NULL DEFAULT 'PENDING', "voucher_id" uuid, "report_unlocked_at" TIMESTAMP, "paid_at" TIMESTAMP, "payment_reference" character varying(255), CONSTRAINT "UQ_59153b538a49254d44f32d8f8f9" UNIQUE ("sync_key"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "session_results" ("id" SERIAL NOT NULL, "category_id" character varying(50) NOT NULL, "score" integer NOT NULL, "total_possible" integer NOT NULL, "percentage" integer NOT NULL, "suggested_careers" json, "material_snippet" text, "session_id" uuid, CONSTRAINT "PK_63e14e93943750e132bde7a38e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_31d2d6b638d4b396937d392278" ON "session_results" ("session_id") `);
        await queryRunner.query(`CREATE TABLE "session_swipes" ("id" SERIAL NOT NULL, "card_id" character varying(50) NOT NULL, "category_id" character varying(50) NOT NULL, "is_liked" boolean NOT NULL, "timestamp" TIMESTAMP NOT NULL, "session_id" uuid, CONSTRAINT "PK_a0b4a5cbac18075c7bc2b1d6755" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8c4ab13fd6a4c4d62a91c0e932" ON "session_swipes" ("session_id") `);
        await queryRunner.query(`CREATE TABLE "vocational_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "categoryId" character varying NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7553c89ce59a2d0e617a251cc7" UNIQUE ("categoryId"), CONSTRAINT "PK_22edf9968c11c06a6068cbdd1cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tres_areas_combinations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "combination_key" character varying(255) NOT NULL, "title" character varying(255) NOT NULL, "area_1" character varying(120) NOT NULL, "area_2" character varying(120) NOT NULL, "area_3" character varying(120) NOT NULL, "narrative" text NOT NULL, "tendencies" text array NOT NULL DEFAULT '{}', "possible_jobs" text NOT NULL, "related_professions" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eb3c71034598d66c32f5ab01fea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_tres_areas_combinations_combination_key" ON "tres_areas_combinations" ("combination_key") `);
        await queryRunner.query(`ALTER TABLE "session_metrics" ADD CONSTRAINT "FK_82f41dc4d58d4f608f65b077308" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_822972ceea1fda0973b8acc7bbe" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "institutions" ADD CONSTRAINT "FK_29d0ccfb71ec6aef28e68ec4c97" FOREIGN KEY ("responsible_therapist_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_684695a073df2293d062be97485" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" ADD CONSTRAINT "FK_0c1d6d6fd3395052c8834f670df" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_a1a521f31aa74ec151da9a70809" FOREIGN KEY ("batch_id") REFERENCES "voucher_batches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_adf923f7defdbfa1a05efeac191" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_181f1983341ea5ed5ec20c71d4a" FOREIGN KEY ("owner_institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_e1650be52548e7b86dab96e1c91" FOREIGN KEY ("redeemed_session_id") REFERENCES "sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_8159d85a4925c5d04f1725d780e" FOREIGN KEY ("therapist_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_355cf5b7df327d6b1aece8cfb87" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_579c47c03a6dc4a9f65f55e0e09" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_3238ef96f18b355b671619111bc" FOREIGN KEY ("id") REFERENCES "session_metrics"("session_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_results" ADD CONSTRAINT "FK_31d2d6b638d4b396937d3922789" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_swipes" ADD CONSTRAINT "FK_8c4ab13fd6a4c4d62a91c0e932e" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_swipes" DROP CONSTRAINT "FK_8c4ab13fd6a4c4d62a91c0e932e"`);
        await queryRunner.query(`ALTER TABLE "session_results" DROP CONSTRAINT "FK_31d2d6b638d4b396937d3922789"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_3238ef96f18b355b671619111bc"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_579c47c03a6dc4a9f65f55e0e09"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_355cf5b7df327d6b1aece8cfb87"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_8159d85a4925c5d04f1725d780e"`);
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_e1650be52548e7b86dab96e1c91"`);
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_181f1983341ea5ed5ec20c71d4a"`);
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_adf923f7defdbfa1a05efeac191"`);
        await queryRunner.query(`ALTER TABLE "vouchers" DROP CONSTRAINT "FK_a1a521f31aa74ec151da9a70809"`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_0c1d6d6fd3395052c8834f670df"`);
        await queryRunner.query(`ALTER TABLE "voucher_batches" DROP CONSTRAINT "FK_684695a073df2293d062be97485"`);
        await queryRunner.query(`ALTER TABLE "institutions" DROP CONSTRAINT "FK_29d0ccfb71ec6aef28e68ec4c97"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_822972ceea1fda0973b8acc7bbe"`);
        await queryRunner.query(`ALTER TABLE "session_metrics" DROP CONSTRAINT "FK_82f41dc4d58d4f608f65b077308"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_tres_areas_combinations_combination_key"`);
        await queryRunner.query(`DROP TABLE "tres_areas_combinations"`);
        await queryRunner.query(`DROP TABLE "vocational_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8c4ab13fd6a4c4d62a91c0e932"`);
        await queryRunner.query(`DROP TABLE "session_swipes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31d2d6b638d4b396937d392278"`);
        await queryRunner.query(`DROP TABLE "session_results"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TYPE "public"."sessions_payment_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efc30b2b9169e05e0e1e19d6dd"`);
        await queryRunner.query(`DROP TABLE "vouchers"`);
        await queryRunner.query(`DROP TYPE "public"."vouchers_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."vouchers_owner_type_enum"`);
        await queryRunner.query(`DROP TABLE "voucher_batches"`);
        await queryRunner.query(`DROP TYPE "public"."voucher_batches_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."voucher_batches_owner_type_enum"`);
        await queryRunner.query(`DROP TABLE "institutions"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "session_metrics"`);
    }

}
