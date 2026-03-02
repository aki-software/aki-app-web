import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1772475889104 implements MigrationInterface {
    name = 'InitialSchema1772475889104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patient_id" character varying, "patient_name" character varying(255) NOT NULL, "holland_code" character varying(20), "total_time_ms" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "session_results" ("id" SERIAL NOT NULL, "category_id" character varying(50) NOT NULL, "score" integer NOT NULL, "total_possible" integer NOT NULL, "percentage" integer NOT NULL, "session_id" uuid, CONSTRAINT "PK_63e14e93943750e132bde7a38e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_31d2d6b638d4b396937d392278" ON "session_results" ("session_id") `);
        await queryRunner.query(`CREATE TABLE "session_swipes" ("id" SERIAL NOT NULL, "card_id" character varying(50) NOT NULL, "category_id" character varying(50) NOT NULL, "is_liked" boolean NOT NULL, "timestamp" TIMESTAMP NOT NULL, "session_id" uuid, CONSTRAINT "PK_a0b4a5cbac18075c7bc2b1d6755" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8c4ab13fd6a4c4d62a91c0e932" ON "session_swipes" ("session_id") `);
        await queryRunner.query(`ALTER TABLE "session_results" ADD CONSTRAINT "FK_31d2d6b638d4b396937d3922789" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_swipes" ADD CONSTRAINT "FK_8c4ab13fd6a4c4d62a91c0e932e" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_swipes" DROP CONSTRAINT "FK_8c4ab13fd6a4c4d62a91c0e932e"`);
        await queryRunner.query(`ALTER TABLE "session_results" DROP CONSTRAINT "FK_31d2d6b638d4b396937d3922789"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8c4ab13fd6a4c4d62a91c0e932"`);
        await queryRunner.query(`DROP TABLE "session_swipes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31d2d6b638d4b396937d392278"`);
        await queryRunner.query(`DROP TABLE "session_results"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
    }

}
