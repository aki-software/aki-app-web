#!/usr/bin/env node

/**
 * A.KIT Platform - Stress Test & Load Simulator
 * ----------------------------------------------------
 * Runs a concurrent stress test hitting the /sessions/complete endpoint
 * to verify the response time remains low (< 300ms) under concurrent load.
 * 
 * Usage:
 *   node scripts/stress-test.js [options]
 * 
 * Options:
 *   -n, --requests     Total number of sessions to submit (default: 50)
 *   -c, --concurrency  Maximum number of concurrent requests (default: 5)
 *   --url              Endpoint URL (default: http://localhost:3000/api/v1/sessions/complete)
 */

import { randomUUID } from 'crypto';

// Parse arguments
const args = process.argv.slice(2);
let totalRequests = 50;
let concurrency = 5;
let url = 'http://localhost:3000/api/v1/sessions/complete';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-n' || args[i] === '--requests') {
    totalRequests = parseInt(args[++i], 10);
  } else if (args[i] === '-c' || args[i] === '--concurrency') {
    concurrency = parseInt(args[++i], 10);
  } else if (args[i] === '--url') {
    url = args[++i];
  }
}

console.log(`\n\x1b[35m=== A.KIT BACKEND STRESS TEST & LOAD SIMULATOR ===\x1b[0m`);
console.log(`Target URL:  \x1b[36m${url}\x1b[0m`);
console.log(`Requests:    \x1b[36m${totalRequests}\x1b[0m`);
console.log(`Concurrency: \x1b[36m${concurrency}\x1b[0m\n`);

// Helper to generate a realistic CompleteSessionDto payload
function generatePayload() {
  const userId = randomUUID();
  const now = new Date();
  const startedAt = new Date(now.getTime() - 120_000).toISOString(); // 2 mins ago
  const finishedAt = now.toISOString();

  // Create ~60 realistic swipes
  const cardTypes = ['R', 'I', 'A', 'S', 'E', 'C'];
  const swipes = [];
  for (let i = 1; i <= 60; i++) {
    const cardType = cardTypes[i % cardTypes.length];
    swipes.push({
      cardId: `card-${i}`,
      categoryId: `cat-${cardType}`,
      liked: Math.random() > 0.4,
      timestamp: new Date(now.getTime() - 120_000 + i * 1500).toISOString()
    });
  }

  return {
    id: randomUUID(),
    userId: userId,
    patientName: `Stress Test User ${Math.floor(Math.random() * 10000)}`,
    catalogVersion: '1.0.0',
    startedAt: startedAt,
    finishedAt: finishedAt,
    swipes: swipes,
    resultPayload: {
      radar: [
        { categoryId: 'cat-R', likes: 8, total: 10, affinity: 80 },
        { categoryId: 'cat-I', likes: 7, total: 10, affinity: 70 },
        { categoryId: 'cat-A', likes: 5, total: 10, affinity: 50 },
        { categoryId: 'cat-S', likes: 9, total: 10, affinity: 90 },
        { categoryId: 'cat-E', likes: 6, total: 10, affinity: 60 },
        { categoryId: 'cat-C', likes: 4, total: 10, affinity: 40 }
      ],
      top3: [
        { categoryId: 'cat-S', percentage: 90, score: 9, totalPossible: 10, suggestedCareers: ['Psychologist', 'Teacher'] },
        { categoryId: 'cat-R', percentage: 80, score: 8, totalPossible: 10, suggestedCareers: ['Engineer', 'Mechanic'] },
        { categoryId: 'cat-I', percentage: 70, score: 7, totalPossible: 10, suggestedCareers: ['Scientist', 'Researcher'] }
      ],
      bottom3: [
        { categoryId: 'cat-C', percentage: 40, score: 4, totalPossible: 10 },
        { categoryId: 'cat-A', percentage: 50, score: 5, totalPossible: 10 },
        { categoryId: 'cat-E', percentage: 60, score: 6, totalPossible: 10 }
      ],
      hollandCode: 'SRI'
    }
  };
}

async function sendRequest(id) {
  const payload = generatePayload();
  const startTime = performance.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const duration = performance.now() - startTime;
    const data = await res.json().catch(() => ({}));

    return {
      id,
      status: res.status,
      duration,
      success: res.status >= 200 && res.status < 300,
      duplicated: data.duplicated || false,
    };
  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      id,
      status: 0,
      duration,
      success: false,
      error: error.message,
    };
  }
}

async function run() {
  const startTime = performance.now();
  const results = [];
  const queue = Array.from({ length: totalRequests }, (_, i) => i + 1);
  
  // Progress indicators
  let completed = 0;
  
  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      const res = await sendRequest(id);
      results.push(res);
      completed++;
      process.stdout.write(`\rProgress: [${completed}/${totalRequests}] ${(completed / totalRequests * 100).toFixed(0)}%`);
    }
  }

  // Spawn workers for concurrency
  const workers = Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker());
  await Promise.all(workers);
  
  const totalDuration = performance.now() - startTime;

  // Process stats
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const durations = results.map(r => r.duration).sort((a, b) => a - b);
  const sumDuration = durations.reduce((a, b) => a + b, 0);
  const avgDuration = sumDuration / results.length;
  
  const p50 = durations[Math.floor(durations.length * 0.50)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

  console.log(`\n\n\x1b[32m=== RESULTS SUMMARY ===\x1b[0m`);
  console.log(`Total Time Elapsed:   \x1b[1m${(totalDuration / 1000).toFixed(2)}s\x1b[0m`);
  console.log(`Throughput:           \x1b[1m${(results.length / (totalDuration / 1000)).toFixed(2)} reqs/sec\x1b[0m`);
  console.log(`Success Rate:         \x1b[32m${successful.length} / ${results.length} (${(successful.length / results.length * 100).toFixed(1)}%)\x1b[0m`);
  console.log(`Failure Rate:         \x1b[31m${failed.length} / ${results.length} (${(failed.length / results.length * 100).toFixed(1)}%)\x1b[0m`);
  
  console.log(`\n\x1b[36m=== RESPONSE TIMES ===\x1b[0m`);
  console.log(`Minimum:              \x1b[1m${durations[0].toFixed(2)}ms\x1b[0m`);
  console.log(`Average (Mean):       \x1b[1m${avgDuration.toFixed(2)}ms\x1b[0m`);
  console.log(`50th Percentile (p50): \x1b[1m${p50.toFixed(2)}ms\x1b[0m`);
  console.log(`95th Percentile (p95): \x1b[1m${p95.toFixed(2)}ms\x1b[0m`);
  console.log(`99th Percentile (p99): \x1b[1m${p99.toFixed(2)}ms\x1b[0m`);
  console.log(`Maximum:              \x1b[1m${durations[durations.length - 1].toFixed(2)}ms\x1b[0m`);

  // Print any failures
  if (failed.length > 0) {
    console.log(`\n\x1b[31m=== SAMPLE FAILURES ===\x1b[0m`);
    failed.slice(0, 5).forEach(f => {
      console.log(`Req #${f.id} failed with status \x1b[1m${f.status}\x1b[0m${f.error ? ` Error: ${f.error}` : ''}`);
    });
  }
}

run().catch(console.error);
