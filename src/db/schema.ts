/**
 * Drizzle table definitions — portable across libSQL (SQLite/Turso) and Postgres.
 * Avoid dialect-specific types. JSON columns use text with Zod validation on read/write.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ─── Programs ─────────────────────────────────────────────────────────────────

export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  goalStatement: text('goal_statement').notNull(),
  configJson: text('config_json').notNull(),       // ProgramConfig serialized
  settingsJson: text('settings_json').notNull(),   // domain-specific settings JSON
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type ProgramRow = typeof programs.$inferSelect;
export type ProgramInsert = typeof programs.$inferInsert;

// ─── Program Position ─────────────────────────────────────────────────────────

export const programPosition = sqliteTable('program_position', {
  programId: text('program_id')
    .primaryKey()
    .references(() => programs.id),
  currentCycleOrdinal: integer('current_cycle_ordinal').notNull().default(0),
  currentSessionOrdinal: integer('current_session_ordinal').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type ProgramPositionRow = typeof programPosition.$inferSelect;
export type ProgramPositionInsert = typeof programPosition.$inferInsert;

// ─── Session Records ──────────────────────────────────────────────────────────

export const sessionRecords = sqliteTable('session_records', {
  id: text('id').primaryKey(),
  programId: text('program_id')
    .notNull()
    .references(() => programs.id),
  templateId: text('template_id').notNull(),
  cycleOrdinal: integer('cycle_ordinal').notNull(),
  sessionOrdinal: integer('session_ordinal').notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  durationMinutes: integer('duration_minutes'),
  contextJson: text('context_json'),               // SessionContext | null
  activitiesJson: text('activities_json').notNull(), // ActivityRecord[]
  userNotes: text('user_notes').notNull().default(''),
  skipped: integer('skipped', { mode: 'boolean' }).notNull().default(false),
  skipReason: text('skip_reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type SessionRecordRow = typeof sessionRecords.$inferSelect;
export type SessionRecordInsert = typeof sessionRecords.$inferInsert;

// ─── Coaching Notes ───────────────────────────────────────────────────────────

export const coachingNotes = sqliteTable('coaching_notes', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessionRecords.id),
  phase: text('phase').notNull(),                  // 'pre' | 'post'
  content: text('content').notNull(),
  adjustmentsJson: text('adjustments_json').notNull(), // SessionAdjustment[]
  source: text('source').notNull(),                // 'ai' | 'user'
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
});

export type CoachingNoteRow = typeof coachingNotes.$inferSelect;
export type CoachingNoteInsert = typeof coachingNotes.$inferInsert;
