import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaaSWebDashboardFeatures1785500000000 implements MigrationInterface {
  name = 'AddSaaSWebDashboardFeatures1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add logo_url to institutions
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD "logo_url" character varying`,
    );

    // Create stripe_events table
    await queryRunner.query(
      `CREATE TABLE "stripe_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripe_event_id" character varying NOT NULL, "type" character varying NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, "payload" jsonb NOT NULL, CONSTRAINT "PK_stripe_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_stripe_events_stripe_event_id" ON "stripe_events" ("stripe_event_id")`,
    );

    // Create stripe_product_mappings table
    await queryRunner.query(
      `CREATE TYPE "stripe_currency_enum" AS ENUM('usd', 'ars')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stripe_product_mappings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stripe_price_id" character varying NOT NULL, "currency" "stripe_currency_enum" NOT NULL, "voucher_quantity" integer NOT NULL, "description" character varying, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_stripe_product_mappings" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_stripe_product_mappings_stripe_price_id" ON "stripe_product_mappings" ("stripe_price_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_stripe_product_mappings_stripe_price_id"`,
    );
    await queryRunner.query(`DROP TABLE "stripe_product_mappings"`);
    await queryRunner.query(`DROP TYPE "stripe_currency_enum"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_stripe_events_stripe_event_id"`,
    );
    await queryRunner.query(`DROP TABLE "stripe_events"`);

    await queryRunner.query(
      `ALTER TABLE "institutions" DROP COLUMN "logo_url"`,
    );
  }
}
