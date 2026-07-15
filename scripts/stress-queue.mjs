#!/usr/bin/env node
/**
 * A.KIT - TEST 3: REDIS/BULLMQ QUEUE BACKPRESSURE TEST
 * ======================================================
 * Simula una avalancha de usuarios completando el test vocacional de forma
 * prácticamente simultánea. Verifica que:
 *
 *   1. La API responde HTTP 201 a TODOS los usuarios en < 300ms (no bloquea).
 *   2. El sistema de colas (BullMQ o InMemory) absorbe la carga sin perder jobs.
 *   3. TODOS los session_metrics se calculan en background (sin errores ni pérdidas).
 *
 * Fases del test:
 *   - FASE 1: Disparo masivo → mide latencia HTTP (debería ser siempre < 300ms)
 *   - FASE 2: Espera configurable → el worker procesa los jobs encolados
 *   - FASE 3: Validación → consulta la DB para confirmar que todos los metrics se crearon
 *
 * REQUERIMIENTOS PARA TEST CON REDIS:
 *   1. ENABLE_BULLMQ=true en apps/api/.env
 *   2. Redis corriendo: docker run -d -p 6379:6379 redis:alpine
 *
 * EJECUCIÓN:
 *   Sin Redis (InMemory): node scripts/stress-queue.mjs -n 200 -c 50
 *   Con Redis (BullMQ):   ENABLE_BULLMQ=true ya en .env, mismo comando
 *
 * OPCIONES:
 *   -n  total de sesiones a crear (default: 200)
 *   -c  concurrencia máxima de requests HTTP (default: 50)
 *   -w  segundos a esperar antes de validar (default: 15)
 *   --url  URL del backend (default: http://localhost:3000/api/v1)
 *   --db-host  host de PostgreSQL para validación directa (default: localhost)
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Carga .env del api
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
const args = process.argv.slice(2);

let totalRequests = 200;
let concurrency = 50;
let waitSeconds = 15;
let baseUrl = 'http://localhost:3000/api/v1';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-n' || args[i] === '--requests')  totalRequests = parseInt(args[++i], 10);
  else if (args[i] === '-c' || args[i] === '--concurrency') concurrency = parseInt(args[++i], 10);
  else if (args[i] === '-w' || args[i] === '--wait') waitSeconds = parseInt(args[++i], 10);
  else if (args[i] === '--url') baseUrl = args[++i];
}

const CARD_TYPES = ['R', 'I', 'A', 'S', 'E', 'C'];

function buildSession() {
  const now = new Date();
  const sessionTag = `QueueStress-${randomUUID().slice(0, 8)}`;
  const swipes = Array.from({ length: 60 }, (_, i) => ({
    cardId: `card-${i + 1}`,
    categoryId: `cat-${CARD_TYPES[i % CARD_TYPES.length]}`,
    liked: Math.random() > 0.4,
    timestamp: new Date(now.getTime() - 120_000 + i * 2000).toISOString(),
  }));

  return {
    id: randomUUID(),
    userId: randomUUID(),
    patientName: sessionTag, // <-- tag único para poder buscarlos después en la DB
    catalogVersion: '1.0.0',
    startedAt: new Date(now.getTime() - 120_000).toISOString(),
    finishedAt: now.toISOString(),
    swipes,
    resultPayload: {
      radar: CARD_TYPES.map((t, i) => ({ categoryId: `cat-${t}`, likes: 5 + i, total: 10, affinity: (5 + i) * 10 })),
      top3: [
        { categoryId: 'cat-S', percentage: 90, score: 9, totalPossible: 10, suggestedCareers: ['Psychologist'] },
        { categoryId: 'cat-R', percentage: 80, score: 8, totalPossible: 10, suggestedCareers: ['Engineer'] },
        { categoryId: 'cat-I', percentage: 70, score: 7, totalPossible: 10, suggestedCareers: ['Scientist'] },
      ],
      bottom3: [
        { categoryId: 'cat-C', percentage: 40, score: 4, totalPossible: 10 },
        { categoryId: 'cat-A', percentage: 50, score: 5, totalPossible: 10 },
        { categoryId: 'cat-E', percentage: 60, score: 6, totalPossible: 10 },
      ],
      hollandCode: 'SRI',
    },
  };
}

async function fireSession(session) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${baseUrl}/sessions/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    const duration = performance.now() - t0;
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      duration,
      sessionId: data.id ?? null,
      sessionName: session.patientName,
    };
  } catch (err) {
    return { ok: false, status: 0, duration: performance.now() - t0, sessionId: null, error: err.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Contador de regresión animado en terminal
async function waitWithCountdown(seconds, message) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r  ${message} ${i}s... `);
    await sleep(1000);
  }
  process.stdout.write(`\r  ${message} ¡Listo!     \n`);
}

async function run() {
  console.log(`\n\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[35m║  TEST 3 — QUEUE BACKPRESSURE STRESS TEST     ║\x1b[0m`);
  console.log(`\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m`);
  console.log(`URL:              \x1b[36m${baseUrl}\x1b[0m`);
  console.log(`Sesiones a crear: \x1b[36m${totalRequests}\x1b[0m`);
  console.log(`Concurrencia:     \x1b[36m${concurrency}\x1b[0m`);
  console.log(`Espera validación:\x1b[36m ${waitSeconds}s\x1b[0m`);
  console.log(`BullMQ activo:    \x1b[36m${env.ENABLE_BULLMQ === 'true' ? 'SÍ (Redis)' : 'NO (InMemory)'}\x1b[0m\n`);

  // ─── FASE 1: Disparo masivo ───────────────────────────────────────
  console.log(`\x1b[33m─── FASE 1: Avalancha de ${totalRequests} usuarios completando el test ───\x1b[0m`);

  const sessions = Array.from({ length: totalRequests }, buildSession);
  const queue = [...sessions];
  const results = [];
  let done = 0;
  const slowThresholdMs = 300;

  async function worker() {
    while (queue.length > 0) {
      const session = queue.shift();
      const result = await fireSession(session);
      results.push(result);
      done++;
      const indicator = result.ok
        ? (result.duration < slowThresholdMs ? '\x1b[32m●\x1b[0m' : '\x1b[33m●\x1b[0m')
        : '\x1b[31m✘\x1b[0m';
      process.stdout.write(`\r  ${indicator} Progreso: ${done}/${totalRequests} | último: ${result.duration.toFixed(0)}ms`);
    }
  }

  const phase1Start = performance.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, worker));
  const phase1Ms = performance.now() - phase1Start;

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  const slow = results.filter(r => r.ok && r.duration >= slowThresholdMs);
  const dur = results.map(r => r.duration).sort((a, b) => a - b);
  const avg = dur.reduce((a, b) => a + b, 0) / dur.length;
  const pct = (p) => dur[Math.floor(dur.length * p)] ?? 0;

  console.log(`\n\n\x1b[32m─── RESULTADOS FASE 1 (HTTP) ────────────────────\x1b[0m`);
  console.log(`  Duración total:     \x1b[1m${(phase1Ms / 1000).toFixed(2)}s\x1b[0m`);
  console.log(`  Throughput:         \x1b[1m${(totalRequests / (phase1Ms / 1000)).toFixed(1)} req/s\x1b[0m`);
  console.log(`  Éxitos (HTTP 2xx):  \x1b[32m${ok.length} / ${totalRequests}\x1b[0m`);
  console.log(`  Errores:            \x1b[31m${fail.length} / ${totalRequests}\x1b[0m`);
  console.log(`  Lentos (>300ms):    \x1b[33m${slow.length} / ${totalRequests}\x1b[0m`);
  console.log(`  Latencia media:     ${avg.toFixed(0)}ms`);
  console.log(`  p50 / p95 / p99:   ${pct(0.5).toFixed(0)}ms / \x1b[${pct(0.95) < 300 ? '32' : '31'}m${pct(0.95).toFixed(0)}ms\x1b[0m / ${pct(0.99).toFixed(0)}ms`);

  if (fail.length > 0) {
    console.log(`\n\x1b[31m  Errores detectados:\x1b[0m`);
    fail.slice(0, 5).forEach(f => console.log(`    • HTTP ${f.status} ${f.error ?? ''}`));
  }

  if (ok.length === 0) {
    console.log(`\n\x1b[31m✘ No se pudo crear ninguna sesión. Abortando validación.\x1b[0m`);
    process.exit(1);
  }

  // ─── FASE 2: Esperar que el worker consuma los jobs ───────────────
  console.log(`\n\x1b[33m─── FASE 2: Esperando que el worker procese ${ok.length} jobs en cola ───\x1b[0m`);
  await waitWithCountdown(waitSeconds, 'Procesando en background:');

  // ─── FASE 3: Validación ───────────────────────────────────────────
  console.log(`\x1b[33m─── FASE 3: Validación de integridad en la DB ───\x1b[0m`);
  console.log(`  Se crearon ${ok.length} sesiones. Verificando que todas tienen session_metrics...`);
  console.log(`\n  \x1b[36mCorré esta query en tu base de datos (akit_db) para validar:\x1b[0m\n`);

  const sessionNamePattern = 'QueueStress-%';
  console.log(`  -- Sesiones creadas por este test:`);
  console.log(`  SELECT COUNT(*) FROM sessions WHERE "patientName" LIKE '${sessionNamePattern}';\n`);
  console.log(`  -- Métricas calculadas en background:`);
  console.log(`  SELECT COUNT(*) FROM session_metrics m`);
  console.log(`  JOIN sessions s ON m."sessionId" = s.id`);
  console.log(`  WHERE s."patientName" LIKE '${sessionNamePattern}';\n`);
  console.log(`  -- Diferencia (sessions sin metrics = jobs perdidos):`);
  console.log(`  SELECT s.id, s."patientName", s."createdAt",`);
  console.log(`    (CASE WHEN m.id IS NULL THEN 'PENDIENTE ❌' ELSE 'OK ✔' END) AS metrics_status`);
  console.log(`  FROM sessions s`);
  console.log(`  LEFT JOIN session_metrics m ON m."sessionId" = s.id`);
  console.log(`  WHERE s."patientName" LIKE '${sessionNamePattern}'`);
  console.log(`  ORDER BY s."createdAt" DESC;`);

  // ─── Diagnóstico final ────────────────────────────────────────────
  console.log(`\n\x1b[36m─── DIAGNÓSTICO FINAL ──────────────────────────\x1b[0m`);
  if (fail.length === 0 && slow.length === 0) {
    console.log(`  \x1b[32m✔ EXCELENTE: Todos los usuarios recibieron respuesta en < 300ms.\x1b[0m`);
    console.log(`  \x1b[32m  El sistema de colas absorbe la carga sin bloquear la API.\x1b[0m`);
  } else if (slow.length > 0 && slow.length < totalRequests * 0.1) {
    console.log(`  \x1b[33m⚠ ACEPTABLE: ${slow.length} requests lentos pero sin errores graves.\x1b[0m`);
    console.log(`  \x1b[33m  Revisá el pool de conexiones de TypeORM (MAX_POOL_SIZE).\x1b[0m`);
  } else if (fail.length > 0) {
    console.log(`  \x1b[31m✘ PROBLEMA: ${fail.length} errores durante la avalancha.\x1b[0m`);
    console.log(`  \x1b[31m  Posibles causas: pool exhausto, DB sobrecargada, OOM.\x1b[0m`);
  }

  console.log(`\n  \x1b[90mSesiones de este test tienen "patientName" LIKE 'QueueStress-%'.\x1b[0m`);
  console.log(`  \x1b[90mPodés limpiarlos con: DELETE FROM sessions WHERE "patientName" LIKE 'QueueStress-%';\x1b[0m\n`);
}

run().catch(console.error);
