import { describe, it, expect } from 'vitest';
import { createStewSmithPullupProgram } from '../../../src/domains/workout/programs/stew-smith-pullups.js';
import { WorkoutSettingsSchema, StewSmithWorkoutSettingsSchema } from '../../../src/domains/workout/schemas.js';
import { stewSmithPullupRule, stewSmithAssistanceRule } from '../../../src/domains/workout/rules/stew-smith.js';
import type { ProgressionParams } from '../../../src/core/progression.js';

// Basic sanity tests for the Stew Smith program

describe('Stew Smith pull-up program', () => {
  it('creates an 8-week program with 3 sessions per week by default', () => {
    const prog = createStewSmithPullupProgram({ currentMaxPullups: 0 });
    expect(prog.cycles.length).toBe(8);
    expect(prog.cycles[0].sessions.length).toBe(3);
    expect(prog.name).toContain('Stew Smith');
    // settings should validate with appropriate schema
    expect(() => WorkoutSettingsSchema.parse(prog.settings)).toThrow();
    expect(() => StewSmithWorkoutSettingsSchema.parse(prog.settings)).not.toThrow();
  });

  it('allows 4 sessions per week and disables assistance', () => {
    const prog = createStewSmithPullupProgram({ currentMaxPullups: 5, sessionsPerWeek: 4, includeAssistance: false });
    expect(prog.cycles[0].sessions.length).toBe(4);
    expect((prog.settings as any).includeAssistance).toBe(false);
  });

  it('progression rule produces reps_only target', () => {
    const template = {
      config: { phase: 'build', sessionNumber: 2, exercise: 'strict' },
      progressionRuleId: 'workout.stew_smith_pullups',
    } as any;
    const params: ProgressionParams = {
        programSettings: { currentMaxPullups: 3, unit: 'bodyweight' },
        template,
        history: [],
        cycleOrdinal: 0,
        sessionOrdinal: 0
    };
    const target = stewSmithPullupRule.compute(params);
    expect(target.planned.kind).toBe('reps_only');
    if (target.planned.kind === 'reps_only') {
      expect(typeof target.planned.reps).toBe('number');
    }
  });

  it('assistance rule returns reasonable reps', () => {
    const template = {
      config: { exercise: 'negative', phase: 'foundation', sessionNumber: 1 },
      progressionRuleId: 'workout.stew_smith_assistance',
    } as any;
    const params: ProgressionParams = {
        programSettings: { currentMaxPullups: 0 },
        template,
        history: [],
        cycleOrdinal: 0,
        sessionOrdinal: 0
    };
    const target = stewSmithAssistanceRule.compute(params);
    expect(target.planned.kind).toBe('reps_only');
    expect(target.sets).toBeGreaterThan(0);
  });
});