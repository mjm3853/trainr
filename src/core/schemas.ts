/**
 * Core domain schemas — the single source of truth for all domain types.
 * All TypeScript types are derived via z.infer<>. All inputs pass through
 * these schemas before entering the domain layer.
 */

import { z } from 'zod';

// ─── Identifiers ─────────────────────────────────────────────────────────────

export const DomainIdSchema = z.string().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/);
export type DomainId = z.infer<typeof DomainIdSchema>;

export const IdSchema = z.string().uuid();
export type Id = z.infer<typeof IdSchema>;

// ─── Activity Metrics ─────────────────────────────────────────────────────────
// Drives recording UX — each kind maps to a different input form.

export const ActivityMetricSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('load_reps'), unit: z.enum(['lbs', 'kg']) }),
  z.object({ kind: z.literal('reps_only') }),
  z.object({ kind: z.literal('duration'), unit: z.enum(['minutes', 'seconds']) }),
  z.object({ kind: z.literal('rating'), scale: z.number().int().min(2).max(100) }),
  z.object({ kind: z.literal('count'), label: z.string().min(1) }),
  z.object({ kind: z.literal('completion') }),
]);
export type ActivityMetric = z.infer<typeof ActivityMetricSchema>;

// ─── Activity Values ──────────────────────────────────────────────────────────
// The recorded result — mirrors ActivityMetric.

export const ActivityValueSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('load_reps'), weight: z.number().positive(), reps: z.number().int().positive(), unit: z.enum(['lbs', 'kg']) }),
  z.object({ kind: z.literal('reps_only'), reps: z.number().int().positive() }),
  z.object({ kind: z.literal('duration'), value: z.number().positive(), unit: z.enum(['minutes', 'seconds']) }),
  z.object({ kind: z.literal('rating'), score: z.number() }),
  z.object({ kind: z.literal('count'), count: z.number().int().nonnegative() }),
  z.object({ kind: z.literal('completion'), completed: z.boolean() }),
]);
export type ActivityValue = z.infer<typeof ActivityValueSchema>;

// ─── Activity Target ──────────────────────────────────────────────────────────
// Computed by ProgressionRule — what the session plan calls for.

export const ActivityTargetSchema = z.object({
  planned: ActivityValueSchema,
  sets: z.number().int().positive().optional(),
  note: z.string().nullable(),
});
export type ActivityTarget = z.infer<typeof ActivityTargetSchema>;

// ─── Activity Template ────────────────────────────────────────────────────────
// Declared in program config — describes what to do and how to progress it.

export const ActivityTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  metric: ActivityMetricSchema,
  progressionRuleId: z.string().min(1),
  config: z.record(z.unknown()),
});
export type ActivityTemplate = z.infer<typeof ActivityTemplateSchema>;

// ─── Activity Record ──────────────────────────────────────────────────────────
// What was actually done — persisted alongside the session.

export const ActivitySetSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  value: ActivityValueSchema,
  completed: z.boolean(),
  note: z.string().nullable(),
});
export type ActivitySet = z.infer<typeof ActivitySetSchema>;

export const ActivityRecordSchema = z.object({
  templateId: z.string().min(1),
  target: ActivityTargetSchema,
  sets: z.array(ActivitySetSchema),
  rpe: z.number().min(1).max(10).nullable(),
  aiAdjusted: z.boolean(),
  adjustmentReason: z.string().nullable(),
});
export type ActivityRecord = z.infer<typeof ActivityRecordSchema>;

// ─── Session Template ─────────────────────────────────────────────────────────
// Declared in program config — one planned day of engagement.

export const SessionTemplateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  activities: z.array(ActivityTemplateSchema).min(1),
  estimatedDuration: z.number().int().positive(),
  notes: z.string(),
});
export type SessionTemplate = z.infer<typeof SessionTemplateSchema>;

// ─── Cycle Template ───────────────────────────────────────────────────────────
// A repeating temporal unit within a program.

export const CycleTemplateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  ordinal: z.number().int().nonnegative(),
  sessions: z.array(SessionTemplateSchema).min(1),
  repeatCount: z.number().int().positive().default(1),
  progressionPhase: z.string().min(1),
});
export type CycleTemplate = z.infer<typeof CycleTemplateSchema>;

// ─── Program Config ───────────────────────────────────────────────────────────
// Declarative config authored per domain — validated by domain module.

export const ProgramConfigSchema = z.object({
  name: z.string().min(1),
  domain: DomainIdSchema,
  goalStatement: z.string().min(1),
  settings: z.record(z.unknown()),
  cycles: z.array(CycleTemplateSchema).min(1),
});
export type ProgramConfig = z.infer<typeof ProgramConfigSchema>;

// ─── Program Record ───────────────────────────────────────────────────────────
// A program as stored in the DB — includes user-specific data.

export const ProgramRecordSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  domain: DomainIdSchema,
  goalStatement: z.string().min(1),
  configJson: z.string(),
  settings: z.record(z.unknown()),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
});
export type ProgramRecord = z.infer<typeof ProgramRecordSchema>;

// ─── Program Position ─────────────────────────────────────────────────────────
// Tracks where the user is in their current program.

export const ProgramPositionSchema = z.object({
  programId: IdSchema,
  currentCycleOrdinal: z.number().int().nonnegative(),
  currentSessionOrdinal: z.number().int().nonnegative(),
  updatedAt: z.date(),
});
export type ProgramPosition = z.infer<typeof ProgramPositionSchema>;

// ─── Session Context ──────────────────────────────────────────────────────────
// Pre-session disturbance input — modifies AI coaching recommendations.

export const PainPointSchema = z.object({
  area: z.string().min(1),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type PainPoint = z.infer<typeof PainPointSchema>;

export const SessionContextSchema = z.object({
  energyLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  painPoints: z.array(PainPointSchema),
  timeConstraintMinutes: z.number().int().positive().nullable(),
  location: z.string().min(1),
  additionalNotes: z.string(),
  recordedAt: z.date(),
});
export type SessionContext = z.infer<typeof SessionContextSchema>;

// ─── Session Adjustment ───────────────────────────────────────────────────────
// Structured AI-suggested modification to a planned activity.

export const SessionAdjustmentSchema = z.object({
  activityId: z.string().min(1),
  field: z.string().min(1),
  originalValue: ActivityValueSchema.nullable(),
  adjustedValue: ActivityValueSchema.nullable(),
  rationale: z.string().min(1),
});
export type SessionAdjustment = z.infer<typeof SessionAdjustmentSchema>;

// ─── Coaching Note ────────────────────────────────────────────────────────────
// AI-generated or user-authored narrative attached to a session.

export const CoachingNoteSchema = z.object({
  id: IdSchema,
  sessionId: IdSchema,
  phase: z.enum(['pre', 'post']),
  content: z.string().min(1),
  adjustments: z.array(SessionAdjustmentSchema),
  generatedAt: z.date(),
  source: z.enum(['ai', 'user']),
});
export type CoachingNote = z.infer<typeof CoachingNoteSchema>;

// ─── Session Record ───────────────────────────────────────────────────────────
// A completed (or skipped) session — persisted to DB.

export const SessionRecordSchema = z.object({
  id: IdSchema,
  programId: IdSchema,
  templateId: z.string().min(1),
  cycleOrdinal: z.number().int().nonnegative(),
  sessionOrdinal: z.number().int().nonnegative(),
  completedAt: z.date().nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  context: SessionContextSchema.nullable(),
  activities: z.array(ActivityRecordSchema),
  userNotes: z.string(),
  skipped: z.boolean(),
  skipReason: z.string().nullable(),
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;

// ─── Input validation helpers ─────────────────────────────────────────────────
// Guards against adversarial inputs (path traversal, control chars, etc.)

const DANGEROUS_PATTERNS = [
  /\.\.\//,           // path traversal
  /[\x00-\x1f]/,      // control characters (ASCII < 0x20)
  /[<>{}|\\^`]/,      // shell metacharacters
];

export function validateUserString(input: string): string {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      throw new Error(`Invalid input: contains disallowed characters`);
    }
  }
  return input;
}

export const SafeStringSchema = z.string().refine(
  (s) => DANGEROUS_PATTERNS.every((p) => !p.test(s)),
  { message: 'Input contains disallowed characters' },
);
