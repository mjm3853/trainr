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
  .description(`Personal coaching CLI — progressive programs for every domain

🤖 AI AGENTS: Use --output json for structured data. See 'trainr schema' for types.
   Quick start: 'trainr session next --output json' | 'trainr program status --output json'`)
  .version('0.1.0')
  .option('--ai-help', 'Show AI agent usage guidance');

// ─── AI Agent Guidance ────────────────────────────────────────────────────────

// Override help to include AI guidance
const originalHelp = program.helpInformation.bind(program);
program.helpInformation = function() {
  const args = process.argv.slice(2);
  const isDirectHelp = args.includes('-h') || args.includes('--help');

  if (isDirectHelp) {
    return originalHelp() + `

╔════════════════════════════════════════════════════════════════════════════════╗
║                          🤖 AI AGENT QUICK START                               ║
╚════════════════════════════════════════════════════════════════════════════════╝

If you're an AI agent, here are the most useful commands:

📋 STATE QUERIES (Safe, deterministic, agent-friendly):
   • trainr session next --output json          # Get today's plan
   • trainr program status --output json        # Check position
   • trainr program list --output json          # List active programs
   • trainr history --output json               # Recent sessions

🔍 SCHEMA INTROSPECTION (For runtime validation):
   • trainr schema                             # List available schemas
   • trainr schema session.next                 # Get output type definition

⚠️  INTERACTIVE COMMANDS (Not suitable for agents):
   • trainr program new                         # Interactive wizard
   • trainr session start                       # Requires user prompts
   • trainr coach ask                           # Requires API key

📖 For detailed guidance: See AGENT_GUIDE.md or README.md#for-ai-agents

══════════════════════════════════════════════════════════════════════════════════
`;
  }

  return originalHelp();
};

program.on('option:ai-help', () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                          🤖 AI AGENT QUICK START                               ║
╚════════════════════════════════════════════════════════════════════════════════╝

If you're an AI agent, here are the most useful commands:

📋 STATE QUERIES (Safe, deterministic, agent-friendly):
   • trainr session next --output json          # Get today's plan
   • trainr program status --output json        # Check position
   • trainr program list --output json          # List active programs
   • trainr history --output json               # Recent sessions

🔍 SCHEMA INTROSPECTION (For runtime validation):
   • trainr schema                             # List available schemas
   • trainr schema session.next                 # Get output type definition

⚠️  INTERACTIVE COMMANDS (Not suitable for agents):
   • trainr program new                         # Interactive wizard
   • trainr session start                       # Requires user prompts
   • trainr coach ask                           # Requires API key

📖 For detailed guidance: See AGENT_GUIDE.md or README.md#for-ai-agents

══════════════════════════════════════════════════════════════════════════════════
`);
  process.exit(0);
});

// ─── Commands ─────────────────────────────────────────────────────────────────

program.addCommand(createSessionCommand(repos, coach));
program.addCommand(createProgramCommand(repos));
program.addCommand(createHistoryCommand(repos));
program.addCommand(createCoachCommand(repos, coach));
program.addCommand(createSchemaCommand());

// ─── AI Agent Guidance Command ────────────────────────────────────────────────

program
  .command('ai')
  .description('Show AI agent usage guidance')
  .action(() => {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          🤖 AI AGENT QUICK START                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('If you\'re an AI agent, here are the most useful commands:');
    console.log('');
    console.log('📋 STATE QUERIES (Safe, deterministic, agent-friendly):');
    console.log('   • trainr session next --output json          # Get today\'s plan');
    console.log('   • trainr program status --output json        # Check position');
    console.log('   • trainr program list --output json          # List active programs');
    console.log('   • trainr history --output json               # Recent sessions');
    console.log('');
    console.log('🔍 SCHEMA INTROSPECTION (For runtime validation):');
    console.log('   • trainr schema                             # List available schemas');
    console.log('   • trainr schema session.next                 # Get output type definition');
    console.log('');
    console.log('⚠️  INTERACTIVE COMMANDS (Not suitable for agents):');
    console.log('   • trainr program new                         # Interactive wizard');
    console.log('   • trainr session start                       # Requires user prompts');
    console.log('   • trainr coach ask                           # Requires API key');
    console.log('');
    console.log('📖 For detailed guidance: See AGENT_GUIDE.md or README.md#for-ai-agents');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════════════════════════');
  });

program.parse(process.argv);

// ─── Database Migrations ──────────────────────────────────────────────────────

async function runMigrations(db: any) {
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