/**
 * API response types — lightweight mirrors of the backend Zod schemas.
 * No runtime validation; just TypeScript interfaces for the frontend.
 */

// ─── Activity Metric (discriminated union) ────────────────────────────────────

export type ActivityMetric =
  | { kind: "load_reps"; unit: "lbs" | "kg" }
  | { kind: "reps_only" }
  | { kind: "duration"; unit: "minutes" | "seconds" }
  | { kind: "rating"; scale: number }
  | { kind: "count"; label: string }
  | { kind: "completion" };

// ─── Activity Value (discriminated union) ─────────────────────────────────────

export type ActivityValue =
  | { kind: "load_reps"; weight: number; reps: number; unit: "lbs" | "kg" }
  | { kind: "reps_only"; reps: number }
  | { kind: "duration"; value: number; unit: "minutes" | "seconds" }
  | { kind: "rating"; score: number }
  | { kind: "count"; count: number }
  | { kind: "completion"; completed: boolean };

// ─── Targets & Records ───────────────────────────────────────────────────────

export interface ActivityTarget {
  planned: ActivityValue;
  sets?: number;
  note: string | null;
}

export interface ActivitySet {
  ordinal: number;
  value: ActivityValue;
  completed: boolean;
  note: string | null;
}

export interface ActivityRecord {
  templateId: string;
  target: ActivityTarget;
  sets: ActivitySet[];
  rpe: number | null;
  aiAdjusted: boolean;
  adjustmentReason: string | null;
}

// ─── Session Context ─────────────────────────────────────────────────────────

export interface PainPoint {
  area: string;
  severity: 1 | 2 | 3;
}

export interface SessionContext {
  energyLevel: 1 | 2 | 3 | 4 | 5;
  painPoints: PainPoint[];
  timeConstraintMinutes: number | null;
  location: string;
  additionalNotes: string;
  recordedAt: string;
}

// ─── Coaching ────────────────────────────────────────────────────────────────

export interface SessionAdjustment {
  activityId: string;
  field: string;
  originalValue: ActivityValue | null;
  adjustedValue: ActivityValue | null;
  rationale: string;
}

export interface CoachingNote {
  id: string;
  sessionId: string;
  phase: "pre" | "post";
  content: string;
  adjustments: SessionAdjustment[];
  generatedAt: string;
  source: "ai" | "user";
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface PlannedActivity {
  id: string;
  name: string;
  category: string;
  metric: ActivityMetric;
  config: Record<string, unknown>;
  target: ActivityTarget | null;
}

export interface PlannedSessionResponse {
  programId: string;
  programName: string;
  position: string;
  session: {
    id: string;
    label: string;
    estimatedMinutes: number;
    notes: string;
    activities: PlannedActivity[];
  };
  coachingNote: CoachingNote | null;
}

export interface ProgramSummary {
  id: string;
  name: string;
  domain: string;
  goalStatement: string;
  startedAt: string | null;
}

export interface ProgramStatus {
  id: string;
  name: string;
  domain: string;
  goalStatement: string;
  position: string;
  cycleOrdinal: number;
  sessionOrdinal: number;
}

export interface HistorySession {
  id: string;
  templateId: string;
  label: string | null;
  cycleOrdinal: number;
  sessionOrdinal: number;
  completedAt: string | null;
  durationMinutes: number | null;
  skipped: boolean;
  skipReason: string | null;
  activityCount: number;
  activities: ActivityRecord[];
  context: SessionContext | null;
  userNotes: string;
  notes: CoachingNote[];
}

export interface SessionDetail {
  id: string;
  programId: string;
  templateId: string;
  label: string | null;
  cycleOrdinal: number;
  sessionOrdinal: number;
  completedAt: string | null;
  durationMinutes: number | null;
  skipped: boolean;
  skipReason: string | null;
  context: SessionContext | null;
  activities: ActivityRecord[];
  userNotes: string;
  notes: CoachingNote[];
}
