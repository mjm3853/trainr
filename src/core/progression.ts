/**
 * ProgressionRule interface + resolver.
 * Rules are pure functions — no I/O. Domain modules register rules by ID.
 * Services resolve rules from the registry before calling compute().
 */

import type { ActivityTemplate, ActivityTarget, ActivityRecord } from './schemas.js';
import { createRegistry } from './registry.js';

// ─── Progression Params ───────────────────────────────────────────────────────

export interface ProgressionParams {
  template: ActivityTemplate;
  history: ActivityRecord[];
  programSettings: Record<string, unknown>;
  cycleOrdinal: number;
  sessionOrdinal: number;
}

// ─── Progression Rule ─────────────────────────────────────────────────────────

export interface ProgressionRule {
  /** Unique ID, namespaced by domain: 'workout.wendler_main', 'golf.consecutive_target' */
  id: string;
  domain: string;
  compute(params: ProgressionParams): ActivityTarget;
}

// ─── Rule Registry ────────────────────────────────────────────────────────────

const rules = createRegistry<ProgressionRule>('ProgressionRule', (r) => r.id);

export const registerRule = rules.register;
export const resolveRule = rules.resolve;
export const clearRules = rules.clear;
