/**
 * DomainModule interface — the extension point for all coaching domains.
 * Implementing this interface is sufficient to add a new domain (golf, learning, etc.)
 * with zero changes to the core.
 */

import type { ActivityTarget, ActivityRecord, ActivityTemplate, SessionContext } from './schemas.js';
import type { ProgressionRule } from './progression.js';
import { createRegistry } from './registry.js';

export type { DomainId } from './schemas.js';

// ─── Context Question ─────────────────────────────────────────────────────────
// Domain-specific pre-session prompts. Core always collects energy + freeform.
// Domain modules add domain-specific questions.

export type ContextQuestion =
  | { id: string; kind: 'energy_level' }
  | { id: string; kind: 'pain_points' }
  | { id: string; kind: 'time_constraint' }
  | { id: string; kind: 'location' }
  | { id: string; kind: 'freeform'; prompt: string };

// ─── Result type ──────────────────────────────────────────────────────────────

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E = string>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─── Domain Module ────────────────────────────────────────────────────────────

export interface DomainModule {
  /** Stable identifier, e.g. 'workout', 'golf', 'learning' */
  id: string;
  displayName: string;

  /** Domain-specific progression rules registered by ID */
  progressionRules: ProgressionRule[];

  /** Additional context questions to ask before a session */
  contextQuestions: ContextQuestion[];

  /** System prompt fragment for the AI coach — domain context and guidelines */
  systemPrompt: string;

  /** Validate domain-specific program settings (the `settings` field in ProgramConfig) */
  validateProgramSettings(settings: unknown): Result<void>;

  /** Format an ActivityTarget for human display, e.g. "245 lbs × 5 reps (3 sets)" */
  formatActivityTarget(template: ActivityTemplate, target: ActivityTarget): string;

  /** Format an ActivityRecord for history display */
  formatActivityRecord(template: ActivityTemplate, record: ActivityRecord): string;

  /**
   * Summarize a completed session in one line for history views and AI context.
   * e.g. "Squat 5/5/8 @ 245 | Bench 5/5/6 @ 185"
   */
  summarizeSession(
    activities: Array<{ template: ActivityTemplate; record: ActivityRecord }>,
  ): string;

  /**
   * Optionally generate additional AI context from domain-specific program settings.
   * This is included in CoachInput to give the AI domain awareness.
   */
  contextForAI(settings: Record<string, unknown>, context: SessionContext | null): Record<string, unknown>;
}

// ─── Domain Registry ─────────────────────────────────────────────────────────

const registry = createRegistry<DomainModule>('Domain', (m) => m.id);

export const registerDomain = registry.register;
export const getDomain = registry.resolve;
export const listDomains = registry.list;
export const clearRegistry = registry.clear;
