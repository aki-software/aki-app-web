import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVocationalCategory1772480434327 implements MigrationInterface {
    name = 'AddVocationalCategory1772480434327'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "vocational_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "categoryId" character varying NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7553c89ce59a2d0e617a251cc7" UNIQUE ("categoryId"), CONSTRAINT "PK_22edf9968c11c06a6068cbdd1cd" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "vocational_category"`);
    }

}
