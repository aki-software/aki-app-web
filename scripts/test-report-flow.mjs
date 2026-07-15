#!/usr/bin/env node

/**
 * A.KIT Platform - End-to-End Report Generation Test
 * ----------------------------------------------------
 * Simulates a full user flow:
 * 1. Completes a session via /sessions/complete (lightning fast, background metrics)
 * 2. Obtains a JWT Token by logging in as Admin
 * 3. Triggers the PDF generation & email delivery via /sessions/:id/send-report
 * 
 * This tests the actual Puppeteer PDF compilation and SMTP/Mail delivery in local!
 * 
 * Usage:
 *   node scripts/test-report-flow.mjs
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Minimal .env reader to avoid external dependencies
function loadEnv() {
  const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
  if (!fs.existsSync(envPath)) return {};
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

const env = loadEnv();
const baseUrl = 'http://localhost:3000/api/v1';
const adminEmail = env.ADMIN_USER || 'akituvocacion@gmail.com';
const adminPassword = env.ADMIN_PASS || 'akituvocacion@gmail.com';

console.log(`\n\x1b[35m=== A.KIT REPORT GENERATION FLOW TEST ===\x1b[0m`);
console.log(`Base URL:     \x1b[36m${baseUrl}\x1b[0m`);
console.log(`Admin User:   \x1b[36m${adminEmail}\x1b[0m\n`);

function generatePayload() {
  const userId = randomUUID();
  const now = new Date();
  const startedAt = new Date(now.getTime() - 120_000).toISOString();
  const finishedAt = now.toISOString();

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
    patientName: `Test Report E2E ${Math.floor(Math.random() * 1000)}`,
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

async function run() {
  // Step 1: Login as Admin
  console.log(`\x1b[33m[1/3] Logging in as Admin...\x1b[0m`);
  let token = '';
  try {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const authData = await loginRes.json();
    token = authData.tokens.accessToken;
    console.log(`\x1b[32m✔ Login successful! Token acquired.\x1b[0m\n`);
  } catch (error) {
    console.error(`\x1b[31m❌ Login failed: ${error.message}\x1b[0m`);
    console.log(`Please make sure your DB is seeded and process.env.ADMIN_USER matches.`);
    process.exit(1);
  }

  // Step 2: Complete the session
  console.log(`\x1b[33m[2/3] Submitting completed session...\x1b[0m`);
  const sessionPayload = generatePayload();
  let sessionId = '';
  
  const completeStart = performance.now();
  try {
    const res = await fetch(`${baseUrl}/sessions/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionPayload)
    });

    const completeDuration = performance.now() - completeStart;

    if (!res.ok) {
      throw new Error(`Session completion failed with status ${res.status}`);
    }

    const sessionData = await res.json();
    sessionId = sessionData.id;
    console.log(`\x1b[32m✔ Session completed successfully!\x1b[0m`);
    console.log(`Session ID: \x1b[36m${sessionId}\x1b[0m`);
    console.log(`Response Time: \x1b[32m${completeDuration.toFixed(2)}ms\x1b[0m (Optimized background metrics!)\n`);
  } catch (error) {
    console.error(`\x1b[31m❌ Session completion failed: ${error.message}\x1b[0m`);
    process.exit(1);
  }

  // Step 3: Trigger send-report
  console.log(`\x1b[33m[3/3] Requesting report generation and email dispatch...\x1b[0m`);
  console.log(`\x1b[90m(This triggers Puppeteer PDF rendering & SMTP dispatch)\x1b[0m`);

  const reportStart = performance.now();
  try {
    const res = await fetch(`${baseUrl}/sessions/${sessionId}/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email: 'test-destinatario@example.com' })
    });

    const reportDuration = performance.now() - reportStart;

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`Report generation failed with status ${res.status}: ${JSON.stringify(errBody)}`);
    }

    const reportResult = await res.json();
    console.log(`\n\x1b[32m✔ E2E FLOW COMPLETED SUCCESSFULLY!\x1b[0m`);
    console.log(`Status:         \x1b[32m${reportResult.message || 'Success'}\x1b[0m`);
    console.log(`PDF Rendering & Delivery Time: \x1b[35m${(reportDuration / 1000).toFixed(2)}s\x1b[0m`);
    console.log(`\x1b[90mCheck your Mailtrap (http://localhost:2525 or sandbox) to see the sent PDF email!\x1b[0m\n`);
  } catch (error) {
    console.error(`\x1b[31m❌ Report generation failed: ${error.message}\x1b[0m`);
    process.exit(1);
  }
}

run().catch(console.error);
