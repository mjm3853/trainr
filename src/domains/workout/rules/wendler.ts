/**
 * Wendler 5/3/1 progression rules.
 *
 * Main work:
 *   5s week:    65% × 5, 75% × 5, 85% × AMRAP
 *   3s week:    70% × 3, 80% × 3, 90% × AMRAP
 *   1s week:    75% × 5, 85% × 3, 95% × AMRAP (1+)
 *   Deload:     40% × 5, 50% × 5, 60% × 5
 *
 * All percentages are of the Training Max (TM), not 1RM.
 * Weights round to the nearest `roundingIncrement` (default 5 lbs).
 */

import type { ProgressionRule, ProgressionParams } from '../../../core/progression.js';
import type { ActivityTarget } from '../../../core/schemas.js';
import { WorkoutSettingsSchema, WendlerMainConfigSchema, WendlerBBBConfigSchema } from '../schemas.js';

// ─── Weight rounding ──────────────────────────────────────────────────────────

export function roundWeight(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

// ─── Wendler set schemes ──────────────────────────────────────────────────────

interface WendlerSet {
  percentage: number;
  reps: number | 'amrap';
}

const WENDLER_SCHEMES: Record<string, WendlerSet[]> = {
  '5s': [
    { percentage: 0.65, reps: 5 },
    { percentage: 0.75, reps: 5 },
    { percentage: 0.85, reps: 'amrap' },
  ],
  '3s': [
    { percentage: 0.70, reps: 3 },
    { percentage: 0.80, reps: 3 },
    { percentage: 0.90, reps: 'amrap' },
  ],
  '1s': [
    { percentage: 0.75, reps: 5 },
    { percentage: 0.85, reps: 3 },
    { percentage: 0.95, reps: 'amrap' },
  ],
  deload: [
    { percentage: 0.40, reps: 5 },
    { percentage: 0.50, reps: 5 },
    { percentage: 0.60, reps: 5 },
  ],
};

// ─── Wendler Main Rule ────────────────────────────────────────────────────────
// Returns the top (working) set target. The full set scheme is encoded in the
// config and displayed by the formatter; the target represents the final set.

export const wendlerMainRule: ProgressionRule = {
  id: 'workout.wendler_main',
  domain: 'workout',

  compute(params: ProgressionParams): ActivityTarget {
    const settings = WorkoutSettingsSchema.parse(params.programSettings);
    const config = WendlerMainConfigSchema.parse(params.template.config);

    const tm = settings.trainingMaxes[config.lift];
    if (tm === undefined) {
      throw new Error(`No training max found for lift '${config.lift}'`);
    }

    const scheme = WENDLER_SCHEMES[config.weekScheme];
    if (!scheme) {
      throw new Error(`Unknown week scheme '${config.weekScheme}'`);
    }

    // The "working set" is the last (highest percentage) set
    const workingSet = scheme[scheme.length - 1];
    if (!workingSet) {
      throw new Error(`Empty scheme for '${config.weekScheme}'`);
    }

    const weight = roundWeight(tm * workingSet.percentage, settings.roundingIncrement);
    const reps = workingSet.reps === 'amrap' ? 1 : workingSet.reps; // minimum for amrap

    return {
      planned: {
        kind: 'load_reps',
        weight,
        reps,
        unit: (settings.unit as 'lbs' | 'kg'),
      },
      sets: scheme.length,
      note: workingSet.reps === 'amrap'
        ? `TM: ${tm}${settings.unit}. Last set is AMRAP (minimum ${reps}). Full scheme: ${formatScheme(scheme, tm, settings.roundingIncrement, settings.unit)}`
        : `TM: ${tm}${settings.unit}. Scheme: ${formatScheme(scheme, tm, settings.roundingIncrement, settings.unit)}`,
    };
  },
};

// ─── Wendler BBB Rule ─────────────────────────────────────────────────────────
// Boring But Big supplemental: 5×10 at 50% of TM (configurable).

export const wendlerBBBRule: ProgressionRule = {
  id: 'workout.wendler_bbb',
  domain: 'workout',

  compute(params: ProgressionParams): ActivityTarget {
    const settings = WorkoutSettingsSchema.parse(params.programSettings);
    const config = WendlerBBBConfigSchema.parse(params.template.config);

    const tm = settings.trainingMaxes[config.lift];
    if (tm === undefined) {
      throw new Error(`No training max found for lift '${config.lift}'`);
    }

    const weight = roundWeight(tm * config.percentage, settings.roundingIncrement);

    return {
      planned: {
        kind: 'load_reps',
        weight,
        reps: config.reps,
        unit: (settings.unit as 'lbs' | 'kg'),
      },
      sets: config.sets,
      note: `BBB: ${config.sets}×${config.reps} @ ${Math.round(config.percentage * 100)}% TM (${tm}${settings.unit})`,
    };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScheme(
  scheme: WendlerSet[],
  tm: number,
  increment: number,
  unit: string,
): string {
  return scheme
    .map((s) => {
      const weight = roundWeight(tm * s.percentage, increment);
      const repsStr = s.reps === 'amrap' ? 'AMRAP' : `${s.reps}`;
      return `${weight}${unit}×${repsStr}`;
    })
    .join(', ');
}
