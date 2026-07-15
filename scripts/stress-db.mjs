#!/usr/bin/env node
/**
 * A.KIT - TEST 1: DATABASE WRITE STRESS TEST
 * ============================================
 * Mide el throughput real de inserciones en PostgreSQL vía el endpoint
 * POST /sessions/complete. Cada request inserta: 1 sesión + 60 swipes +
 * resultados (cascade). Diseñado para encontrar el límite del pool de
 * conexiones de TypeORM y el máximo de escrituras concurrentes de Postgres.
 *
 * OBJETIVO: Respuesta < 300ms al p95 con 50 concurrentes.
 *
 * EJECUCIÓN:
 *   Liviana:  node scripts/stress-db.mjs -n 100 -c 10
 *   Moderada: node scripts/stress-db.mjs -n 300 -c 30
 *   Máxima:   node scripts/stress-db.mjs -n 500 -c 50
 */

import { randomUUID } from 'crypto';

const args = process.argv.slice(2);
let totalRequests = 100;
let concurrency = 10;
let baseUrl = 'http://localhost:3000/api/v1';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-n' || args[i] === '--requests') totalRequests = parseInt(args[++i], 10);
  else if (args[i] === '-c' || args[i] === '--concurrency') concurrency = parseInt(args[++i], 10);
  else if (args[i] === '--url') baseUrl = args[++i];
}

const CARD_TYPES = ['R', 'I', 'A', 'S', 'E', 'C'];

function generateSession() {
  const now = new Date();
  const startedAt = new Date(now.getTime() - 120_000).toISOString();
  const finishedAt = now.toISOString();

  const swipes = Array.from({ length: 60 }, (_, i) => {
    const cardType = CARD_TYPES[i % CARD_TYPES.length];
    return {
      cardId: `card-${i + 1}`,
      categoryId: `cat-${cardType}`,
      liked: Math.random() > 0.4,
      timestamp: new Date(now.getTime() - 120_000 + i * 2000).toISOString(),
    };
  });

  return {
    id: randomUUID(),
    userId: randomUUID(),
    patientName: `DB Stress ${randomUUID().slice(0, 8)}`,
    catalogVersion: '1.0.0',
    startedAt,
    finishedAt,
    swipes,
    resultPayload: {
      radar: CARD_TYPES.map((t, i) => ({
        categoryId: `cat-${t}`,
        likes: 5 + i,
        total: 10,
        affinity: (5 + i) * 10,
      })),
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

async function sendOne(id) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${baseUrl}/sessions/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generateSession()),
    });
    const duration = performance.now() - t0;
    return { id, ok: res.ok, status: res.status, duration };
  } catch (err) {
    return { id, ok: false, status: 0, duration: performance.now() - t0, error: err.message };
  }
}

async function run() {
  console.log(`\n\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[35m║    TEST 1 — DATABASE WRITE STRESS TEST       ║\x1b[0m`);
  console.log(`\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m`);
  console.log(`URL:           \x1b[36m${baseUrl}/sessions/complete\x1b[0m`);
  console.log(`Total requests: \x1b[36m${totalRequests}\x1b[0m`);
  console.log(`Concurrency:    \x1b[36m${concurrency}\x1b[0m`);
  console.log(`Swipes/request: \x1b[36m60 (cascade INSERT)\x1b[0m\n`);

  const queue = Array.from({ length: totalRequests }, (_, i) => i + 1);
  const results = [];
  let done = 0;

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      results.push(await sendOne(id));
      done++;
      process.stdout.write(`\r  Progress: ${done}/${totalRequests} (${Math.round(done / totalRequests * 100)}%)`);
    }
  }

  const globalStart = performance.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, worker));
  const totalMs = performance.now() - globalStart;

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  const dur = results.map(r => r.duration).sort((a, b) => a - b);
  const avg = dur.reduce((a, b) => a + b, 0) / dur.length;

  const pct = (p) => dur[Math.floor(dur.length * p)] ?? 0;

  console.log(`\n\n\x1b[32m─── RESULTS ───────────────────────────────────\x1b[0m`);
  console.log(`Elapsed:        \x1b[1m${(totalMs / 1000).toFixed(2)}s\x1b[0m`);
  console.log(`Throughput:     \x1b[1m${(totalRequests / (totalMs / 1000)).toFixed(1)} req/s\x1b[0m`);
  console.log(`Success:        \x1b[32m${ok.length} / ${totalRequests}\x1b[0m`);
  console.log(`Failures:       \x1b[31m${fail.length} / ${totalRequests}\x1b[0m`);
  console.log(`\n\x1b[36m─── RESPONSE TIMES ────────────────────────────\x1b[0m`);
  console.log(`  min:  ${dur[0].toFixed(0)}ms`);
  console.log(`  avg:  ${avg.toFixed(0)}ms`);
  console.log(`  p50:  ${pct(0.5).toFixed(0)}ms`);
  console.log(`  p95:  \x1b[${pct(0.95) < 300 ? '32' : '31'}m${pct(0.95).toFixed(0)}ms${pct(0.95) < 300 ? ' ✔ OK' : ' ✘ SLOW'}\x1b[0m`);
  console.log(`  p99:  ${pct(0.99).toFixed(0)}ms`);
  console.log(`  max:  ${dur[dur.length - 1].toFixed(0)}ms`);

  if (fail.length > 0) {
    console.log(`\n\x1b[31m─── SAMPLE ERRORS ─────────────────────────────\x1b[0m`);
    fail.slice(0, 5).forEach(f =>
      console.log(`  #${f.id} → HTTP ${f.status} ${f.error ?? ''}`)
    );
  }

  console.log(`\n\x1b[33mVERIFICÁ en la DB:\x1b[0m`);
  console.log(`  SELECT COUNT(*) FROM sessions WHERE "patientName" LIKE 'DB Stress%';`);
  console.log(`  SELECT COUNT(*) FROM session_swipes;`);
}

run().catch(console.error);
