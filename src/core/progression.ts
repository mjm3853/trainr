/**
 * ProgressionRule interface + resolver.
 * Rules are pure functions — no I/O. Domain modules register rules by ID.
 * Services resolve rules from the registry before calling compute().
 */

import type { ActivityTemplate, ActivityTarget, ActivityRecord } from './schemas.js';

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

const rules = new Map<string, ProgressionRule>();

export function registerRule(rule: ProgressionRule): void {
  if (rules.has(rule.id)) {
    throw new Error(`ProgressionRule '${rule.id}' is already registered`);
  }
  rules.set(rule.id, rule);
}

export function resolveRule(id: string): ProgressionRule {
  const rule = rules.get(id);
  if (!rule) {
    const available = [...rules.keys()].join(', ');
    throw new Error(`Unknown ProgressionRule '${id}'. Registered: ${available}`);
  }
  return rule;
}

export function clearRules(): void {
  rules.clear();
}
