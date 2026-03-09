import { describe, it, expect } from 'vitest';
import { currentSession, advancePosition, positionLabel } from '../../src/core/program.js';
import type { ProgramConfig } from '../../src/core/schemas.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const twoWeekProgram: ProgramConfig = {
  name: 'Two Week Test',
  domain: 'workout',
  goalStatement: 'Test program',
  settings: {},
  cycles: [
    {
      id: 'week1',
      label: 'Week 1',
      ordinal: 0,
      repeatCount: 1,
      progressionPhase: 'accumulation',
      sessions: [
        {
          id: 'w1d1',
          label: 'Day 1',
          estimatedDuration: 60,
          notes: '',
          activities: [
            {
              id: 'a1',
              name: 'Squat',
              category: 'main_lift',
              metric: { kind: 'load_reps', unit: 'lbs' },
              progressionRuleId: 'workout.wendler_main',
              config: {},
            },
          ],
        },
        {
          id: 'w1d2',
          label: 'Day 2',
          estimatedDuration: 60,
          notes: '',
          activities: [
            {
              id: 'a2',
              name: 'Bench',
              category: 'main_lift',
              metric: { kind: 'load_reps', unit: 'lbs' },
              progressionRuleId: 'workout.wendler_main',
              config: {},
            },
          ],
        },
      ],
    },
    {
      id: 'week2',
      label: 'Week 2',
      ordinal: 1,
      repeatCount: 1,
      progressionPhase: 'intensification',
      sessions: [
        {
          id: 'w2d1',
          label: 'Day 1',
          estimatedDuration: 60,
          notes: '',
          activities: [
            {
              id: 'a3',
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

// ─── currentSession ───────────────────────────────────────────────────────────

describe('currentSession', () => {
  it('returns the correct session at cycle 0, session 0', () => {
    const result = currentSession(twoWeekProgram, { currentCycleOrdinal: 0, currentSessionOrdinal: 0 });
    expect(result.session.label).toBe('Day 1');
    expect(result.cycle.label).toBe('Week 1');
    expect(result.isLastSessionInCycle).toBe(false);
    expect(result.isLastCycle).toBe(false);
  });

  it('marks isLastSessionInCycle correctly', () => {
    const result = currentSession(twoWeekProgram, { currentCycleOrdinal: 0, currentSessionOrdinal: 1 });
    expect(result.isLastSessionInCycle).toBe(true);
  });

  it('marks isLastCycle correctly for final session', () => {
    const result = currentSession(twoWeekProgram, { currentCycleOrdinal: 1, currentSessionOrdinal: 0 });
    expect(result.isLastCycle).toBe(true);
  });

  it('throws on invalid cycle ordinal', () => {
    expect(() =>
      currentSession(twoWeekProgram, { currentCycleOrdinal: 99, currentSessionOrdinal: 0 }),
    ).toThrow('Cycle ordinal 99');
  });

  it('throws on invalid session ordinal', () => {
    expect(() =>
      currentSession(twoWeekProgram, { currentCycleOrdinal: 0, currentSessionOrdinal: 99 }),
    ).toThrow('Session ordinal 99');
  });
});

// ─── advancePosition ──────────────────────────────────────────────────────────

describe('advancePosition', () => {
  it('advances within a cycle', () => {
    const result = advancePosition(twoWeekProgram, { currentCycleOrdinal: 0, currentSessionOrdinal: 0 });
    expect(result).toEqual({ cycleOrdinal: 0, sessionOrdinal: 1, programComplete: false });
  });

  it('advances to next cycle at end of cycle', () => {
    const result = advancePosition(twoWeekProgram, { currentCycleOrdinal: 0, currentSessionOrdinal: 1 });
    expect(result).toEqual({ cycleOrdinal: 1, sessionOrdinal: 0, programComplete: false });
  });

  it('returns programComplete at end of last cycle', () => {
    const result = advancePosition(twoWeekProgram, { currentCycleOrdinal: 1, currentSessionOrdinal: 0 });
    expect(result.programComplete).toBe(true);
  });

  it('throws on invalid cycle ordinal', () => {
    expect(() =>
      advancePosition(twoWeekProgram, { currentCycleOrdinal: 99, currentSessionOrdinal: 0 }),
    ).toThrow('Cycle ordinal 99');
  });
});

// ─── positionLabel ────────────────────────────────────────────────────────────

describe('positionLabel', () => {
  it('returns human-readable label', () => {
    const label = positionLabel(twoWeekProgram, { currentCycleOrdinal: 0, currentSessionOrdinal: 0 });
    expect(label).toBe('Week 1 — Day 1 (1 of 2)');
  });

  it('returns Unknown position for out-of-bounds', () => {
    const label = positionLabel(twoWeekProgram, { currentCycleOrdinal: 99, currentSessionOrdinal: 0 });
    expect(label).toBe('Unknown position');
  });
});
