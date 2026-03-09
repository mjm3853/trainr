/**
 * Linear progression rule — simple weight increment per session.
 * Suitable for novice programs (Starting Strength, StrongLifts style).
 * If no prior history, uses startingWeight from config.
 */

import type { ProgressionRule, ProgressionParams } from '../../../core/progression.js';
import type { ActivityTarget } from '../../../core/schemas.js';
import { WorkoutSettingsSchema, LinearProgressionConfigSchema } from '../schemas.js';
import { roundWeight } from './wendler.js';

export const linearProgressionRule: ProgressionRule = {
  id: 'workout.linear',
  domain: 'workout',

  compute(params: ProgressionParams): ActivityTarget {
    const settings = WorkoutSettingsSchema.parse(params.programSettings);
    const config = LinearProgressionConfigSchema.parse(params.template.config);

    // Find the most recent completed set for this activity
    const lastRecord = params.history
      .flatMap((r) => r.sets)
      .filter((s) => s.completed && s.value.kind === 'load_reps')
      .at(-1);

    let weight: number;
    if (lastRecord && lastRecord.value.kind === 'load_reps') {
      weight = lastRecord.value.weight + config.incrementPerSession;
    } else if (config.startingWeight !== undefined) {
      weight = config.startingWeight;
    } else {
      const tm = settings.trainingMaxes[config.lift];
      if (tm === undefined) {
        throw new Error(`No starting weight or training max found for lift '${config.lift}'`);
      }
      weight = roundWeight(tm * 0.5, settings.roundingIncrement);
    }

    weight = roundWeight(weight, settings.roundingIncrement);

    return {
      planned: {
        kind: 'load_reps',
        weight,
        reps: config.reps,
        // stewsmith may introduce 'bodyweight' but this rule only used with lbs/kg
    unit: (settings.unit as 'lbs' | 'kg'),
      },
      sets: config.sets,
      note: lastRecord
        ? `+${config.incrementPerSession}${settings.unit} from last session`
        : `Starting weight`,
    };
  },
};
