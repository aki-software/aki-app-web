import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeightedScoresToSessionResult1780455000000 implements MigrationInterface {
  name = 'AddWeightedScoresToSessionResult1780455000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cambiar percentage de INT a FLOAT para mayor precisión psicométrica
    await queryRunner.query(
      `ALTER TABLE "session_results" ALTER COLUMN "percentage" TYPE double precision`,
    );

    // Agregar weighted_score para el score ponderado por tiempo de respuesta
    await queryRunner.query(
      `ALTER TABLE "session_results" ADD COLUMN IF NOT EXISTS "weighted_score" double precision NOT NULL DEFAULT 0`,
    );

    // Agregar avg_response_time_ms para el tiempo de respuesta promedio por categoría
    await queryRunner.query(
      `ALTER TABLE "session_results" ADD COLUMN IF NOT EXISTS "avg_response_time_ms" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "session_results" DROP COLUMN IF EXISTS "avg_response_time_ms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" DROP COLUMN IF EXISTS "weighted_score"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_results" ALTER COLUMN "percentage" TYPE integer`,
    );
  }
}
