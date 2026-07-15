#!/usr/bin/env node
/**
 * A.KIT - TEST 2: PUPPETEER / PDF MEMORY STRESS TEST
 * ====================================================
 * Este es el test más destructivo. Genera sesiones reales en la DB y luego
 * dispara solicitudes CONCURRENTES de generación de PDF con Puppeteer.
 *
 * CADA REQUEST abre una instancia de Chromium headless: ~100-150 MB de RAM.
 * Con c=10: el backend necesita ~1.5 GB de RAM libre solo para esto.
 * Si hay OOM (Out of Memory), el proceso de Node muere o el SO lo mata.
 *
 * OBJETIVO: Encontrar cuántas solicitudes PDF concurrentes soporta el servidor.
 *
 * EJECUCIÓN (empezar de a poco, ir subiendo):
 *   Segura:      node scripts/stress-puppeteer.mjs -n 5  -c 2
 *   Moderada:    node scripts/stress-puppeteer.mjs -n 20 -c 5
 *   Agresiva:    node scripts/stress-puppeteer.mjs -n 50 -c 10   ← puede tirar el server local
 *
 * ADVERTENCIA: Si el servidor cae → ese es tu límite real en local.
 * En producción (Render, Fly.io) el comportamiento varía según RAM del plan.
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

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
const baseUrl = 'http://localhost:3000/api/v1';
const adminEmail = env.ADMIN_USER || 'akituvocacion@gmail.com';
const adminPassword = env.ADMIN_PASS || 'akituvocacion@gmail.com';

const args = process.argv.slice(2);
let totalRequests = 10;
let concurrency = 3;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-n' || args[i] === '--requests') totalRequests = parseInt(args[++i], 10);
  else if (args[i] === '-c' || args[i] === '--concurrency') concurrency = parseInt(args[++i], 10);
}

const CARD_TYPES = ['R', 'I', 'A', 'S', 'E', 'C'];

function buildSessionPayload() {
  const now = new Date();
  const swipes = Array.from({ length: 60 }, (_, i) => ({
    cardId: `card-${i + 1}`,
    categoryId: `cat-${CARD_TYPES[i % CARD_TYPES.length]}`,
    liked: Math.random() > 0.4,
    timestamp: new Date(now.getTime() - 120_000 + i * 2000).toISOString(),
  }));
  return {
    id: randomUUID(),
    userId: randomUUID(),
    patientName: `PDF Stress ${randomUUID().slice(0, 8)}`,
    catalogVersion: '1.0.0',
    startedAt: new Date(now.getTime() - 120_000).toISOString(),
    finishedAt: now.toISOString(),
    swipes,
    resultPayload: {
      radar: CARD_TYPES.map((t, i) => ({ categoryId: `cat-${t}`, likes: 5 + i, total: 10, affinity: (5 + i) * 10 })),
      top3: [
        { categoryId: 'cat-S', percentage: 90, score: 9, totalPossible: 10, suggestedCareers: ['Psychologist', 'Teacher'] },
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

async function getAdminToken() {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.tokens.accessToken;
}

async function completeSession() {
  const res = await fetch(`${baseUrl}/sessions/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSessionPayload()),
  });
  if (!res.ok) throw new Error(`Session creation failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

async function requestReport(token, sessionId, reqNum) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${baseUrl}/sessions/${sessionId}/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email: `stress-test-${reqNum}@mailtrap.local` }),
    });
    const duration = performance.now() - t0;
    const body = await res.json().catch(() => ({}));
    return { id: reqNum, ok: res.ok, status: res.status, duration, message: body.message };
  } catch (err) {
    return { id: reqNum, ok: false, status: 0, duration: performance.now() - t0, error: err.message };
  }
}

async function run() {
  console.log(`\n\x1b[35m╔══════════════════════════════════════════════╗\x1b[0m`);
  console.log(`\x1b[35m║  TEST 2 — PUPPETEER PDF MEMORY STRESS TEST   ║\x1b[0m`);
  console.log(`\x1b[35m╚══════════════════════════════════════════════╝\x1b[0m`);
  console.log(`URL:            \x1b[36m${baseUrl}\x1b[0m`);
  console.log(`Total PDF reqs: \x1b[36m${totalRequests}\x1b[0m`);
  console.log(`Concurrencia:   \x1b[36m${concurrency}\x1b[0m`);
  console.log(`RAM estimada:   \x1b[33m~${concurrency * 130}MB peak (${concurrency} Chromium instances)\x1b[0m\n`);

  // Login
  process.stdout.write(`[1/3] Autenticando como Admin... `);
  let token;
  try {
    token = await getAdminToken();
    console.log(`\x1b[32m✔\x1b[0m`);
  } catch (e) {
    console.log(`\x1b[31m✘ ${e.message}\x1b[0m`);
    process.exit(1);
  }

  // Crear sesiones en paralelo (rápido, sin Puppeteer)
  process.stdout.write(`[2/3] Creando ${totalRequests} sesiones en la DB... `);
  let sessionIds;
  try {
    sessionIds = await Promise.all(Array.from({ length: totalRequests }, completeSession));
    console.log(`\x1b[32m✔ ${sessionIds.length} sesiones creadas\x1b[0m`);
  } catch (e) {
    console.log(`\x1b[31m✘ ${e.message}\x1b[0m`);
    process.exit(1);
  }

  // PDF stress: disparar requests concurrentes
  console.log(`[3/3] Disparando ${totalRequests} solicitudes PDF (c=${concurrency})...\n`);
  console.log(`\x1b[33m⚠  Mirá el Task Manager / htop: el RAM va a subir fuerte.\x1b[0m`);
  console.log(`\x1b[33m⚠  Si el servidor cae → encontraste el límite real.\x1b[0m\n`);

  const queue = sessionIds.map((id, i) => ({ sessionId: id, reqNum: i + 1 }));
  const results = [];
  let done = 0;

  async function worker() {
    while (queue.length > 0) {
      const { sessionId, reqNum } = queue.shift();
      const result = await requestReport(token, sessionId, reqNum);
      results.push(result);
      done++;
      const status = result.ok ? `\x1b[32m✔ ${result.duration.toFixed(0)}ms\x1b[0m` : `\x1b[31m✘ HTTP${result.status}\x1b[0m`;
      process.stdout.write(`\r  Completados: ${done}/${totalRequests} → último: ${status}   `);
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
  console.log(`Elapsed total:  \x1b[1m${(totalMs / 1000).toFixed(2)}s\x1b[0m`);
  console.log(`Throughput:     \x1b[1m${(totalRequests / (totalMs / 1000)).toFixed(2)} PDF/s\x1b[0m`);
  console.log(`Success:        \x1b[32m${ok.length} / ${totalRequests}\x1b[0m`);
  console.log(`Failures:       \x1b[31m${fail.length} / ${totalRequests}\x1b[0m`);
  console.log(`\n\x1b[36m─── PDF RENDER TIMES ──────────────────────────\x1b[0m`);
  console.log(`  min:  ${dur[0].toFixed(0)}ms`);
  console.log(`  avg:  ${avg.toFixed(0)}ms`);
  console.log(`  p50:  ${pct(0.5).toFixed(0)}ms`);
  console.log(`  p95:  ${pct(0.95).toFixed(0)}ms`);
  console.log(`  max:  ${dur[dur.length - 1].toFixed(0)}ms`);

  if (fail.length > 0) {
    console.log(`\n\x1b[31m─── ERRORS ─────────────────────────────────────\x1b[0m`);
    fail.slice(0, 5).forEach(f =>
      console.log(`  req #${f.id} → HTTP ${f.status} ${f.error ?? ''}`)
    );
  }

  console.log(`\n\x1b[36m─── DIAGNÓSTICO ────────────────────────────────\x1b[0m`);
  if (fail.length === 0) {
    console.log(`  \x1b[32m✔ El servidor aguantó ${concurrency} PDFs concurrentes sin errores.\x1b[0m`);
    console.log(`  \x1b[32m  Subí la concurrencia para encontrar el límite real.\x1b[0m`);
  } else if (fail.length < totalRequests * 0.1) {
    console.log(`  \x1b[33m⚠ Algunos fallos (~${fail.length}). El servidor está bajo presión.\x1b[0m`);
    console.log(`  \x1b[33m  Considerá limitar la concurrencia de Puppeteer en producción.\x1b[0m`);
  } else {
    console.log(`  \x1b[31m✘ Demasiados fallos. Encontraste el breaking point.\x1b[0m`);
    console.log(`  \x1b[31m  Necesitás un sistema de colas para Puppeteer (BullMQ worker).\x1b[0m`);
  }
}

run().catch(console.error);
