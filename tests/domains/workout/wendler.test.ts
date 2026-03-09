import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { wendlerMainRule, wendlerBBBRule, roundWeight } from '../../../src/domains/workout/rules/wendler.js';
import { clearRules, registerRule } from '../../../src/core/progression.js';

// ─── roundWeight ──────────────────────────────────────────────────────────────

describe('roundWeight', () => {
  it('rounds to nearest 5', () => {
    expect(roundWeight(242, 5)).toBe(240);
    expect(roundWeight(243, 5)).toBe(245);
    expect(roundWeight(245, 5)).toBe(245);
  });

  it('rounds to nearest 2.5', () => {
    expect(roundWeight(101, 2.5)).toBe(100);
    // 103.75 / 2.5 = 41.5 → rounds to 42 → 105
    expect(roundWeight(103.75, 2.5)).toBe(105);
    expect(roundWeight(101.25, 2.5)).toBe(102.5);
  });
});

// ─── wendlerMainRule ──────────────────────────────────────────────────────────

const BASE_SETTINGS = {
  unit: 'lbs',
  trainingMaxes: { squat: 285, bench: 195, deadlift: 335, press: 135 },
  roundingIncrement: 5,
};

const BASE_TEMPLATE = {
  id: 'squat_main',
  name: 'Back Squat',
  category: 'main_lift',
  metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
  progressionRuleId: 'workout.wendler_main',
  config: { lift: 'squat', weekScheme: '5s' },
};

const BASE_PARAMS = {
  template: BASE_TEMPLATE,
  history: [],
  programSettings: BASE_SETTINGS,
  cycleOrdinal: 0,
  sessionOrdinal: 0,
};

describe('wendlerMainRule', () => {
  it('computes correct 5s week working set for squat (TM=285)', () => {
    const target = wendlerMainRule.compute({ ...BASE_PARAMS });
    // 85% of 285 = 242.25 → rounds to 240
    expect(target.planned.kind).toBe('load_reps');
    if (target.planned.kind === 'load_reps') {
      expect(target.planned.weight).toBe(240);
      expect(target.planned.reps).toBe(1); // minimum for amrap
      expect(target.planned.unit).toBe('lbs');
    }
    expect(target.sets).toBe(3);
    expect(target.note).toContain('AMRAP');
  });

  it('computes correct 3s week working set (TM=285, 90% = 256.5 → 255)', () => {
    const target = wendlerMainRule.compute({
      ...BASE_PARAMS,
      template: { ...BASE_TEMPLATE, config: { lift: 'squat', weekScheme: '3s' } },
    });
    if (target.planned.kind === 'load_reps') {
      expect(target.planned.weight).toBe(255); // 285 * 0.90 = 256.5 → 255
    }
  });

  it('computes correct 1s week working set (TM=285, 95% = 270.75 → 270)', () => {
    const target = wendlerMainRule.compute({
      ...BASE_PARAMS,
      template: { ...BASE_TEMPLATE, config: { lift: 'squat', weekScheme: '1s' } },
    });
    if (target.planned.kind === 'load_reps') {
      expect(target.planned.weight).toBe(270);
    }
  });

  it('computes deload week (TM=285, 60% = 171 → 170)', () => {
    const target = wendlerMainRule.compute({
      ...BASE_PARAMS,
      template: { ...BASE_TEMPLATE, config: { lift: 'squat', weekScheme: 'deload' } },
    });
    if (target.planned.kind === 'load_reps') {
      expect(target.planned.weight).toBe(170); // 285 * 0.60 = 171 → 170
      expect(target.planned.reps).toBe(5);
    }
    expect(target.note).not.toContain('AMRAP');
  });

  it('includes TM in the note', () => {
    const target = wendlerMainRule.compute({ ...BASE_PARAMS });
    expect(target.note).toContain('285');
  });

  it('throws when training max is missing for the lift', () => {
    expect(() =>
      wendlerMainRule.compute({
        ...BASE_PARAMS,
        template: { ...BASE_TEMPLATE, config: { lift: 'row', weekScheme: '5s' } },
        programSettings: { ...BASE_SETTINGS, trainingMaxes: {} },
      }),
    ).toThrow("No training max found for lift 'row'");
  });

  it('works with kg unit', () => {
    const target = wendlerMainRule.compute({
      ...BASE_PARAMS,
      programSettings: {
        unit: 'kg',
        trainingMaxes: { squat: 130 },
        roundingIncrement: 2.5,
      },
    });
    if (target.planned.kind === 'load_reps') {
      expect(target.planned.unit).toBe('kg');
      // 130 * 0.85 = 110.5 → rounds to 110 (nearest 2.5)
      expect(target.planned.weight).toBe(110);
    }
  });

  it('has the correct domain', () => {
    expect(wendlerMainRule.domain).toBe('workout');
    expect(wendlerMainRule.id).toBe('workout.wendler_main');
  });
});

// ─── wendlerBBBRule ───────────────────────────────────────────────────────────

describe('wendlerBBBRule', () => {
  it('computes BBB sets at 50% of TM', () => {
    const target = wendlerBBBRule.compute({
      ...BASE_PARAMS,
      template: {
        ...BASE_TEMPLATE,
        progressionRuleId: 'workout.wendler_bbb',
        config: { lift: 'squat', sets: 5, reps: 10, percentage: 0.5 },
      },
    });
    // 285 * 0.50 = 142.5 → 142.5/5 = 28.5 → rounds to 29 → 145
    if (target.planned.kind === 'load_reps') {
      expect(target.planned.weight).toBe(145);
      expect(target.planned.reps).toBe(10);
    }
    expect(target.sets).toBe(5);
    expect(target.note).toContain('BBB');
    expect(target.note).toContain('50%');
  });

  it('uses configured percentage', () => {
    const target = wendlerBBBRule.compute({
      ...BASE_PARAMS,
      template: {
        ...BASE_TEMPLATE,
        progressionRuleId: 'workout.wendler_bbb',
        config: { lift: 'squat', sets: 5, reps: 10, percentage: 0.65 },
      },
    });
    // 285 * 0.65 = 185.25 → rounds to 185
    if (target.planned.kind === 'load_reps') {
      expect(target.planned.weight).toBe(185);
    }
  });
});
