#!/usr/bin/env node
/**
 * trainr CLI entry point.
 * Wires together: domains, database, AI coach, and CLI commands.
 */

import { Command } from 'commander';
import { registerDomain } from '../core/domain.js';
import { registerRule } from '../core/progression.js';
import { initDb } from '../db/client.js';
import { createDrizzleRepositories } from '../db/repositories/drizzle/index.js';
import { workoutDomain } from '../domains/workout/index.js';
import { nullCoach } from '../ai/coach.js';
import { createSessionCommand } from './commands/session.js';
import { createProgramCommand } from './commands/program.js';
import { createHistoryCommand } from './commands/history.js';
import { createCoachCommand } from './commands/coach.js';
import { createSchemaCommand } from './commands/schema.js';

// ─── Register domains ─────────────────────────────────────────────────────────

registerDomain(workoutDomain);
for (const rule of workoutDomain.progressionRules) {
  registerRule(rule);
}

// ─── Database ─────────────────────────────────────────────────────────────────

const db = initDb();

// Run migrations on startup (simple approach for SQLite)
await runMigrations(db);

const repos = createDrizzleRepositories(db);

// ─── AI Coach ─────────────────────────────────────────────────────────────────

let coach = nullCoach;
if (process.env['ANTHROPIC_API_KEY']) {
  const { createClaudeCoach } = await import('../ai/claude.js');
  coach = createClaudeCoach();
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name('trainr')
  .description('Personal coaching CLI — progressive programs for every domain')
  .version('0.1.0');

program.addCommand(createSessionCommand(repos, coach));
program.addCommand(createProgramCommand(repos));
program.addCommand(createHistoryCommand(repos));
program.addCommand(createCoachCommand(repos, coach));
program.addCommand(createSchemaCommand());

program.parse(process.argv);

// ─── Migration helper ─────────────────────────────────────────────────────────

async function runMigrations(db: ReturnType<typeof initDb>): Promise<void> {
  // Create tables if they don't exist (idempotent)
  await db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      goal_statement TEXT NOT NULL,
      config_json TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS program_position (
      program_id TEXT PRIMARY KEY REFERENCES programs(id),
      current_cycle_ordinal INTEGER NOT NULL DEFAULT 0,
      current_session_ordinal INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS session_records (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES programs(id),
      template_id TEXT NOT NULL,
      cycle_ordinal INTEGER NOT NULL,
      session_ordinal INTEGER NOT NULL,
      completed_at INTEGER,
      duration_minutes INTEGER,
      context_json TEXT,
      activities_json TEXT NOT NULL,
      user_notes TEXT NOT NULL DEFAULT '',
      skipped INTEGER NOT NULL DEFAULT 0,
      skip_reason TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS coaching_notes (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES session_records(id),
      phase TEXT NOT NULL,
      content TEXT NOT NULL,
      adjustments_json TEXT NOT NULL,
      source TEXT NOT NULL,
      generated_at INTEGER NOT NULL
    )
  `);
}
