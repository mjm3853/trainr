#!/usr/bin/env node
/**
 * trainr REST API server.
 * Standalone Hono server exposing coaching functionality for the web UI.
 *
 * Bootstraps identically to CLI and MCP: domains → DB → repos → coach.
 * All endpoints delegate to the service layer.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { registerDomain } from '../core/domain.js';
import { registerRule } from '../core/progression.js';
import { initDb } from '../db/client.js';
import { createDrizzleRepositories } from '../db/repositories/drizzle/index.js';
import { workoutDomain } from '../domains/workout/index.js';
import { nullCoach } from '../ai/coach.js';
import type { Repositories } from '../db/repository.js';
import type { CoachFn } from '../ai/coach.js';
import { programRoutes } from './routes/programs.js';
import { sessionRoutes } from './routes/sessions.js';
import { historyRoutes } from './routes/history.js';

// ─── Boot ─────────────────────────────────────────────────────────────────────

registerDomain(workoutDomain);
for (const rule of workoutDomain.progressionRules) {
  registerRule(rule);
}

const db = initDb();
const repos = createDrizzleRepositories(db);

let coach: CoachFn = nullCoach;
if (process.env['ANTHROPIC_API_KEY']) {
  const { createClaudeCoach } = await import('../ai/claude.js');
  coach = createClaudeCoach();
}

// ─── App ──────────────────────────────────────────────────────────────────────

export type ApiEnv = {
  Variables: {
    repos: Repositories;
    coach: CoachFn;
  };
};

const app = new Hono<ApiEnv>();

app.use('*', cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));

// Global error handler — convert thrown errors to JSON responses
app.onError((err, c) => {
  console.error(`[API] ${c.req.method} ${c.req.path}:`, err.message);
  const status = err.message.includes('not found') || err.message.includes('No active program') ? 404 : 500;
  return c.json({ error: err.message }, status);
});

// Inject dependencies into every request
app.use('*', async (c, next) => {
  c.set('repos', repos);
  c.set('coach', coach);
  await next();
});

app.route('/api', programRoutes);
app.route('/api', sessionRoutes);
app.route('/api', historyRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// ─── Start ────────────────────────────────────────────────────────────────────

const port = parseInt(process.env['PORT'] ?? '8787', 10);
console.log(`trainr API listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
