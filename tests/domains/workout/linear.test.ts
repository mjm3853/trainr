import { describe, it, expect } from 'vitest';
import { linearProgressionRule } from '../../../src/domains/workout/rules/linear.js';
import type { ProgressionParams } from '../../../src/core/progression.js';
import type { ActivityTemplate, ActivityRecord } from '../../../src/core/schemas.js';

const baseTemplate: ActivityTemplate = {
  id: 'squat_linear',
  name: 'Back Squat',
  category: 'main_lift',
  metric: { kind: 'load_reps', unit: 'lbs' },
  progressionRuleId: 'workout.linear',
  config: {
    lift: 'squat',
    sets: 3,
    reps: 5,
    incrementPerSession: 5,
  },
};

const baseSettings = {
  unit: 'lbs',
  trainingMaxes: { squat: 200 },
  roundingIncrement: 5,
};

function makeParams(overrides: Partial<ProgressionParams> = {}): ProgressionParams {
  return {
    template: baseTemplate,
    history: [],
    programSettings: baseSettings,
    cycleOrdinal: 0,
    sessionOrdinal: 0,
    ...overrides,
  };
}

describe('linearProgressionRule', () => {
  it('computes starting weight from training max when no history (50% of TM, rounded)', () => {
    const result = linearProgressionRule.compute(makeParams());
    // 50% of 200 = 100, rounded to nearest 5 = 100
    expect(result.planned).toEqual({ kind: 'load_reps', weight: 100, reps: 5, unit: 'lbs' });
    expect(result.sets).toBe(3);
    expect(result.note).toBe('Starting weight');
  });

  it('increments by incrementPerSession from last completed set', () => {
    const historyRecord: ActivityRecord = {
      templateId: 'squat_linear',
      target: {
        planned: { kind: 'load_reps', weight: 135, reps: 5, unit: 'lbs' },
        sets: 3,
        note: null,
      },
      sets: [
        { ordinal: 0, value: { kind: 'load_reps', weight: 135, reps: 5, unit: 'lbs' }, completed: true, note: null },
        { ordinal: 1, value: { kind: 'load_reps', weight: 135, reps: 5, unit: 'lbs' }, completed: true, note: null },
        { ordinal: 2, value: { kind: 'load_reps', weight: 135, reps: 5, unit: 'lbs' }, completed: true, note: null },
      ],
      rpe: null,
      aiAdjusted: false,
      adjustmentReason: null,
    };

    const result = linearProgressionRule.compute(makeParams({ history: [historyRecord] }));
    // 135 + 5 = 140
    expect(result.planned).toEqual({ kind: 'load_reps', weight: 140, reps: 5, unit: 'lbs' });
    expect(result.note).toBe('+5lbs from last session');
  });

  it('uses explicit startingWeight when provided and no history', () => {
    const templateWithStart: ActivityTemplate = {
      ...baseTemplate,
      config: {
        lift: 'squat',
        sets: 3,
        reps: 5,
        incrementPerSession: 5,
        startingWeight: 115,
      },
    };

    const result = linearProgressionRule.compute(
      makeParams({ template: templateWithStart }),
    );
    expect(result.planned).toEqual({ kind: 'load_reps', weight: 115, reps: 5, unit: 'lbs' });
    expect(result.note).toBe('Starting weight');
  });
});
