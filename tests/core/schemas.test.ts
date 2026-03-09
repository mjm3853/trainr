import { describe, it, expect } from 'vitest';
import {
  ActivityMetricSchema,
  ActivityValueSchema,
  ActivityTargetSchema,
  SessionContextSchema,
  ProgramConfigSchema,
  SafeStringSchema,
  validateUserString,
} from '../../src/core/schemas.js';

describe('ActivityMetricSchema', () => {
  it('parses valid load_reps metric', () => {
    const result = ActivityMetricSchema.parse({ kind: 'load_reps', unit: 'lbs' });
    expect(result).toEqual({ kind: 'load_reps', unit: 'lbs' });
  });

  it('parses valid completion metric', () => {
    const result = ActivityMetricSchema.parse({ kind: 'completion' });
    expect(result).toEqual({ kind: 'completion' });
  });

  it('rejects unknown kind', () => {
    expect(() => ActivityMetricSchema.parse({ kind: 'unknown' })).toThrow();
  });

  it('rejects load_reps without unit', () => {
    expect(() => ActivityMetricSchema.parse({ kind: 'load_reps' })).toThrow();
  });
});

describe('ActivityValueSchema', () => {
  it('parses load_reps value', () => {
    const value = { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' };
    expect(ActivityValueSchema.parse(value)).toEqual(value);
  });

  it('rejects negative weight', () => {
    expect(() =>
      ActivityValueSchema.parse({ kind: 'load_reps', weight: -10, reps: 5, unit: 'lbs' }),
    ).toThrow();
  });

  it('rejects zero reps', () => {
    expect(() =>
      ActivityValueSchema.parse({ kind: 'load_reps', weight: 100, reps: 0, unit: 'lbs' }),
    ).toThrow();
  });

  it('parses completion value', () => {
    expect(ActivityValueSchema.parse({ kind: 'completion', completed: true })).toEqual({
      kind: 'completion',
      completed: true,
    });
  });
});

describe('ActivityTargetSchema', () => {
  it('parses target with note', () => {
    const target = {
      planned: { kind: 'load_reps', weight: 245, reps: 5, unit: 'lbs' },
      sets: 3,
      note: 'TM: 285lbs',
    };
    expect(ActivityTargetSchema.parse(target)).toEqual(target);
  });

  it('parses target with null note', () => {
    const target = {
      planned: { kind: 'completion', completed: false },
      note: null,
    };
    expect(ActivityTargetSchema.parse(target)).toMatchObject({ note: null });
  });
});

describe('SessionContextSchema', () => {
  it('parses valid context', () => {
    const context = {
      energyLevel: 4,
      painPoints: [{ area: 'lower back', severity: 1 }],
      timeConstraintMinutes: null,
      location: 'gym',
      additionalNotes: 'Flew in last night',
      recordedAt: new Date(),
    };
    const result = SessionContextSchema.parse(context);
    expect(result.energyLevel).toBe(4);
    expect(result.painPoints).toHaveLength(1);
  });

  it('rejects invalid energy level', () => {
    expect(() =>
      SessionContextSchema.parse({
        energyLevel: 6,
        painPoints: [],
        timeConstraintMinutes: null,
        location: 'gym',
        additionalNotes: '',
        recordedAt: new Date(),
      }),
    ).toThrow();
  });
});

describe('ProgramConfigSchema', () => {
  it('parses a minimal valid program config', () => {
    const config = {
      name: 'Test Program',
      domain: 'workout',
      goalStatement: 'Get stronger',
      settings: { unit: 'lbs' },
      cycles: [
        {
          id: 'week1',
          label: 'Week 1',
          ordinal: 0,
          repeatCount: 1,
          progressionPhase: 'accumulation',
          sessions: [
            {
              id: 'day1',
              label: 'Day 1',
              estimatedDuration: 60,
              notes: '',
              activities: [
                {
                  id: 'squat',
                  name: 'Squat',
                  category: 'main_lift',
                  metric: { kind: 'load_reps', unit: 'lbs' },
                  progressionRuleId: 'workout.wendler_main',
                  config: {},
                },
              ],
            },
          ],
        },
      ],
    };
    const result = ProgramConfigSchema.parse(config);
    expect(result.name).toBe('Test Program');
    expect(result.cycles).toHaveLength(1);
  });

  it('rejects empty cycles array', () => {
    expect(() =>
      ProgramConfigSchema.parse({
        name: 'Test',
        domain: 'workout',
        goalStatement: 'Get stronger',
        settings: {},
        cycles: [],
      }),
    ).toThrow();
  });
});

describe('SafeStringSchema', () => {
  it('accepts normal strings', () => {
    expect(SafeStringSchema.parse('hello world')).toBe('hello world');
    expect(SafeStringSchema.parse('Squat 5x5 @ 245lbs')).toBe('Squat 5x5 @ 245lbs');
  });

  it('rejects path traversal', () => {
    expect(() => SafeStringSchema.parse('../../etc/passwd')).toThrow();
  });

  it('rejects control characters', () => {
    expect(() => SafeStringSchema.parse('hello\x00world')).toThrow();
    expect(() => SafeStringSchema.parse('test\x1fvalue')).toThrow();
  });
});

describe('validateUserString', () => {
  it('returns the string if safe', () => {
    expect(validateUserString('normal input')).toBe('normal input');
  });

  it('throws on path traversal', () => {
    expect(() => validateUserString('../etc/passwd')).toThrow('Invalid input');
  });

  it('throws on control characters', () => {
    expect(() => validateUserString('test\x00value')).toThrow('Invalid input');
  });
});
