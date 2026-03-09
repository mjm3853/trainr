import { describe, it, expect } from 'vitest';
import {
  formatActivityTarget,
  formatActivityRecord,
  summarizeSession,
} from '../../../src/domains/workout/format.js';
import type {
  ActivityTemplate,
  ActivityTarget,
  ActivityRecord,
} from '../../../src/core/schemas.js';

// ─── Shared templates ────────────────────────────────────────────────────────

const squatTemplate: ActivityTemplate = {
  id: 'squat_main',
  name: 'Back Squat',
  category: 'main_lift',
  metric: { kind: 'load_reps', unit: 'lbs' },
  progressionRuleId: 'workout.wendler_main',
  config: { lift: 'squat', weekScheme: '5s' },
};

const completionTemplate: ActivityTemplate = {
  id: 'stretching',
  name: 'Stretching',
  category: 'accessory',
  metric: { kind: 'completion' },
  progressionRuleId: 'workout.static',
  config: {},
};

const repsOnlyTemplate: ActivityTemplate = {
  id: 'pushups',
  name: 'Push-ups',
  category: 'accessory',
  metric: { kind: 'reps_only' },
  progressionRuleId: 'workout.linear',
  config: {},
};

// ─── formatActivityTarget ────────────────────────────────────────────────────

describe('formatActivityTarget', () => {
  it('formats load_reps with sets and note', () => {
    const target: ActivityTarget = {
      planned: { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' },
      sets: 3,
      note: 'AMRAP on last set',
    };
    const result = formatActivityTarget(squatTemplate, target);
    expect(result).toBe('3×5 reps @ 245 lbs\n    AMRAP on last set');
  });

  it('formats completion metric', () => {
    const target: ActivityTarget = {
      planned: { kind: 'completion', completed: false },
      note: null,
    };
    const result = formatActivityTarget(completionTemplate, target);
    expect(result).toBe('Complete');
  });

  it('formats reps_only metric', () => {
    const target: ActivityTarget = {
      planned: { kind: 'reps_only', reps: 20 },
      sets: 4,
      note: null,
    };
    const result = formatActivityTarget(repsOnlyTemplate, target);
    expect(result).toBe('4×20 reps');
  });
});

// ─── formatActivityRecord ────────────────────────────────────────────────────

describe('formatActivityRecord', () => {
  it('formats completed sets', () => {
    const record: ActivityRecord = {
      templateId: 'squat_main',
      target: {
        planned: { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' },
        sets: 3,
        note: null,
      },
      sets: [
        { ordinal: 0, value: { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' }, completed: true, note: null },
        { ordinal: 1, value: { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' }, completed: true, note: null },
        { ordinal: 2, value: { kind: 'load_reps', weight: 245, reps: 8, unit: 'lbs' }, completed: true, note: null },
      ],
      rpe: 8,
      aiAdjusted: false,
      adjustmentReason: null,
    };
    const result = formatActivityRecord(squatTemplate, record);
    expect(result).toBe('Back Squat: 5×245lbs, 5×245lbs, 8×245lbs @ RPE 8');
  });

  it('handles no completed sets', () => {
    const record: ActivityRecord = {
      templateId: 'squat_main',
      target: {
        planned: { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' },
        sets: 3,
        note: null,
      },
      sets: [
        { ordinal: 0, value: { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' }, completed: false, note: 'skipped' },
      ],
      rpe: null,
      aiAdjusted: false,
      adjustmentReason: null,
    };
    const result = formatActivityRecord(squatTemplate, record);
    expect(result).toBe('Back Squat: — (no sets completed)');
  });
});

// ─── summarizeSession ────────────────────────────────────────────────────────

describe('summarizeSession', () => {
  it('summarizes a mix of load_reps activities', () => {
    const benchTemplate: ActivityTemplate = {
      id: 'bench_main',
      name: 'Bench Press',
      category: 'main_lift',
      metric: { kind: 'load_reps', unit: 'lbs' },
      progressionRuleId: 'workout.wendler_main',
      config: { lift: 'bench', weekScheme: '5s' },
    };

    const activities = [
      {
        template: squatTemplate,
        record: {
          templateId: 'squat_main',
          target: { planned: { kind: 'load_reps' as const, weight: 245, reps: 5, unit: 'lbs' as const }, sets: 3, note: null },
          sets: [
            { ordinal: 0, value: { kind: 'load_reps' as const, weight: 245, reps: 5, unit: 'lbs' as const }, completed: true, note: null },
            { ordinal: 1, value: { kind: 'load_reps' as const, weight: 245, reps: 5, unit: 'lbs' as const }, completed: true, note: null },
            { ordinal: 2, value: { kind: 'load_reps' as const, weight: 245, reps: 8, unit: 'lbs' as const }, completed: true, note: null },
          ],
          rpe: null,
          aiAdjusted: false,
          adjustmentReason: null,
        },
      },
      {
        template: benchTemplate,
        record: {
          templateId: 'bench_main',
          target: { planned: { kind: 'load_reps' as const, weight: 185, reps: 5, unit: 'lbs' as const }, sets: 3, note: null },
          sets: [
            { ordinal: 0, value: { kind: 'load_reps' as const, weight: 185, reps: 5, unit: 'lbs' as const }, completed: true, note: null },
            { ordinal: 1, value: { kind: 'load_reps' as const, weight: 185, reps: 5, unit: 'lbs' as const }, completed: true, note: null },
            { ordinal: 2, value: { kind: 'load_reps' as const, weight: 185, reps: 6, unit: 'lbs' as const }, completed: true, note: null },
          ],
          rpe: null,
          aiAdjusted: false,
          adjustmentReason: null,
        },
      },
    ];

    const result = summarizeSession(activities);
    expect(result).toBe('Back Squat 5/5/8@245lbs | Bench Press 5/5/6@185lbs');
  });
});
