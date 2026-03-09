/**
 * CoachFn interface — the narrow contract the AI layer exposes.
 * Services depend only on CoachFn. The actual Claude implementation is injected.
 * Tests pass deterministic mocks — zero Anthropic SDK calls in test suite.
 */

import type { SessionContext, SessionAdjustment, SessionTemplate, ActivityRecord, ProgramRecord } from '../core/schemas.js';

// ─── Coach Input ──────────────────────────────────────────────────────────────

export interface CoachInput {
  program: ProgramRecord;
  currentSession: SessionTemplate;
  recentHistory: Array<{
    completedAt: Date | null;
    summary: string;
    context: SessionContext | null;
  }>;
  context: SessionContext | null;
  domainContext: Record<string, unknown>;
  userMessage: string | null;
}

// ─── Coach Output ─────────────────────────────────────────────────────────────

export interface CoachOutput {
  narrative: string;
  adjustments: SessionAdjustment[];
  confidence: 'high' | 'medium' | 'low';
}

// ─── Coach Function ───────────────────────────────────────────────────────────

export type CoachFn = (input: CoachInput) => Promise<CoachOutput>;

// ─── Null Coach (fallback when AI is unavailable) ─────────────────────────────

export const nullCoach: CoachFn = async (_input): Promise<CoachOutput> => ({
  narrative: '',
  adjustments: [],
  confidence: 'low',
});
