#!/usr/bin/env node
/**
 * A.KIT - STRESS TEST DATA CLEANUP TOOL
 * =====================================
 * Limpia toda la basura de sesiones, swipes, resultados y métricas generada
 * por las pruebas de estrés (Test 1, Test 2, Test 3 y E2E).
 *
 * Utiliza las variables de entorno de apps/api/.env o acepta variables por parámetro.
 *
 * EJECUCIÓN:
 *   node scripts/cleanup-stress-data.mjs
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';

function loadEnv() {
  const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(l => l.match(/^([^=]+)=(.*)$/))
      .filter(Boolean)
      .map(m => [m[1].trim(), m[2].trim()])
  );
}

const env = loadEnv();

// Configuración de base de datos
const dbConfig = {
  host: process.env.DATABASE_HOST || env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || env.DATABASE_PORT || '5432', 10),
  user: process.env.DATABASE_USER || env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || env.DATABASE_PASSWORD || 'admin123',
  database: process.env.DATABASE_NAME || env.DATABASE_NAME || 'akit_db',
  ssl: (process.env.DATABASE_HOST || env.DATABASE_HOST || '').includes('neon.tech') || (process.env.DATABASE_HOST || env.DATABASE_HOST || '').includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
};

async function run() {
  console.log(`\n\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[35m║    A.KIT — STRESS DATA CLEANUP TOOL          ║\x1b[0m`);
  console.log(`\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m`);
  console.log(`Host:         \x1b[36m${dbConfig.host}\x1b[0m`);
  console.log(`Database:     \x1b[36m${dbConfig.database}\x1b[0m`);
  console.log(`User:         \x1b[36m${dbConfig.user}\x1b[0m\n`);

  const client = new pg.Client(dbConfig);

  try {
    await client.connect();
    console.log(`\x1b[32m✔ Conexión exitosa a la base de datos!\x1b[0m`);

    // Debido a onDelete: 'CASCADE' configurado en TypeORM para session_swipes, session_results y session_metrics,
    // eliminar de la tabla principal "sessions" limpia automáticamente todo lo demás.
    const query = `
      DELETE FROM sessions 
      WHERE "patient_name" LIKE 'QueueStress-%' 
         OR "patient_name" LIKE 'DB Stress%' 
         OR "patient_name" LIKE 'PDF Stress%'
         OR "patient_name" LIKE 'Test Report E2E%'
         OR "patient_name" LIKE 'Stress Test User%';
    `;

    process.stdout.write(`Eliminando sesiones de estrés y sus relaciones en cascada... `);
    const res = await client.query(query);
    console.log(`\x1b[32m✔ Listo!\x1b[0m`);
    console.log(`\n  Se eliminaron \x1b[1m${res.rowCount}\x1b[0m sesiones de prueba.`);
    console.log(`  (Se borraron también todos sus swipes, resultados y métricas asociados en cascada)`);

  } catch (err) {
    console.error(`\n\x1b[31m✘ Error durante la limpieza:\x1b[0m`, err.message);
    console.log(`\n\x1b[33mPodés ejecutar manualmente esta query en tu cliente SQL (pgAdmin / DBeaver / Console):\x1b[0m\n`);
    console.log(`\x1b[36mDELETE FROM sessions \nWHERE "patient_name" LIKE 'QueueStress-%' \n   OR "patient_name" LIKE 'DB Stress%' \n   OR "patient_name" LIKE 'PDF Stress%'\n   OR "patient_name" LIKE 'Test Report E2E%';\x1b[0m\n`);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
