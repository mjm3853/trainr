import { describe, it, expect, beforeEach } from 'vitest';
import { registerDomain, clearRegistry } from '../../src/core/domain.js';
import { registerRule, clearRules } from '../../src/core/progression.js';
import { workoutDomain } from '../../src/domains/workout/index.js';
import { createInMemoryRepositories } from '../../src/db/repositories/memory/index.js';
import { createProgram } from '../../src/services/program.service.js';
import { planSession, logSession, skipSession } from '../../src/services/session.service.js';
import type { CoachFn } from '../../src/ai/coach.js';
import { minimalWorkoutProgram } from '../fixtures/programs.js';
import type { ActivityRecord } from '../../src/core/schemas.js';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearRegistry();
  clearRules();
  registerDomain(workoutDomain);
  for (const rule of workoutDomain.progressionRules) {
    registerRule(rule);
  }
});

const mockCoach: CoachFn = async (_input) => ({
  narrative: 'You are ready to train. Keep good form on all sets.',
  adjustments: [],
  confidence: 'high',
});

const mockCoachWithAdjustment: CoachFn = async (_input) => ({
  narrative: 'Your back discomfort suggests reducing squat intensity today.',
  adjustments: [
    {
      activityId: 'squat_main',
      field: 'weight',
      originalValue: null,
      adjustedValue: { kind: 'load_reps', weight: 130, reps: 5, unit: 'lbs' },
      rationale: 'Reduced due to reported lower back discomfort',
    },
  ],
  confidence: 'medium',
});

// ─── createProgram ────────────────────────────────────────────────────────────

describe('createProgram', () => {
  it('creates a program and initializes position at cycle 0, session 0', async () => {
    const repos = createInMemoryRepositories();
    const program = await createProgram({ config: minimalWorkoutProgram }, repos);

    expect(program.id).toBeTruthy();
    expect(program.domain).toBe('workout');
    expect(program.name).toBe('Test Workout Program');

    const position = await repos.positions.findByProgramId(program.id);
    expect(position?.currentCycleOrdinal).toBe(0);
    expect(position?.currentSessionOrdinal).toBe(0);
  });

  it('throws for unknown domain', async () => {
    const repos = createInMemoryRepositories();
    await expect(
      createProgram({
        config: { ...minimalWorkoutProgram, domain: 'unknown_domain' },
      }, repos),
    ).rejects.toThrow("Unknown domain 'unknown_domain'");
  });
});

// ─── planSession ──────────────────────────────────────────────────────────────

describe('planSession', () => {
  it('returns the current session with resolved targets', async () => {
    const repos = createInMemoryRepositories();
    const program = await createProgram({ config: minimalWorkoutProgram }, repos);
    const plan = await planSession(program.id, repos);

    expect(plan.session.session.label).toBe('Squat Day');
    expect(plan.resolvedTargets).toHaveLength(1);
    expect(plan.resolvedTargets[0]?.planned.kind).toBe('load_reps');
    expect(plan.coachingNote).toBeNull();
  });

  it('calls AI coach when context is provided', async () => {
    const repos = createInMemoryRepositories();
    const program = await createProgram({ config: minimalWorkoutProgram }, repos);

    const plan = await planSession(program.id, repos, {
      context: {
        energyLevel: 4,
        painPoints: [],
        timeConstraintMinutes: null,
        location: 'gym',
        additionalNotes: '',
        recordedAt: new Date(),
      },
      coach: mockCoach,
    });

    expect(plan.coachingNote).not.toBeNull();
    expect(plan.coachingNote?.content).toContain('ready to train');
    expect(plan.coachingNote?.phase).toBe('pre');
    expect(plan.coachingNote?.source).toBe('ai');
  });

  it('does not call AI when no context and no message', async () => {
    const repos = createInMemoryRepositories();
    const program = await createProgram({ config: minimalWorkoutProgram }, repos);
    let coachCalled = false;

    const trackingCoach: CoachFn = async (input) => {
      coachCalled = true;
      return mockCoach(input);
    };

    await planSession(program.id, repos, { coach: trackingCoach });
    expect(coachCalled).toBe(false);
  });
});

// ─── logSession ───────────────────────────────────────────────────────────────

describe('logSession', () => {
  it('saves the session and advances position', async () => {
    const repos = createInMemoryRepositories();
    const program = await createProgram({ config: minimalWorkoutProgram }, repos);
    const plan = await planSession(program.id, repos);

    const activities: ActivityRecord[] = [
      {
        templateId: 'squat_main',
        target: plan.resolvedTargets[0]!,
        sets: [
          { ordinal: 0, value: { kind: 'load_reps', weight: 130, reps: 5, unit: 'lbs' }, completed: true, note: null },
          { ordinal: 1, value: { kind: 'load_reps', weight: 150, reps: 5, unit: 'lbs' }, completed: true, note: null },
          { ordinal: 2, value: { kind: 'load_reps', weight: 170, reps: 8, unit: 'lbs' }, completed: true, note: null },
        ],
        rpe: 7,
        aiAdjusted: false,
        adjustmentReason: null,
      },
    ];

    const result = await logSession(
      { programId: program.id, plannedSession: plan, activities, durationMinutes: 45 },
      repos,
    );

    expect(result.record.skipped).toBe(false);
    expect(result.record.activities).toHaveLength(1);
    expect(result.programComplete).toBe(false);

    // Position should have advanced to session 1
    const position = await repos.positions.findByProgramId(program.id);
    expect(position?.currentSessionOrdinal).toBe(1);
  });

  it('marks program complete after last session', async () => {
    const repos = createInMemoryRepositories();
    // Use a single-session program
    const singleSessionProgram = {
      ...minimalWorkoutProgram,
      cycles: [
        {
          ...minimalWorkoutProgram.cycles[0]!,
          sessions: [minimalWorkoutProgram.cycles[0]!.sessions[0]!],
        },
      ],
    };
    // Remove second cycle
    const oneWeekProgram = { ...singleSessionProgram, cycles: [singleSessionProgram.cycles[0]!] };

    const program = await createProgram({ config: oneWeekProgram }, repos);
    const plan = await planSession(program.id, repos);
    const result = await logSession(
      { programId: program.id, plannedSession: plan, activities: [], durationMinutes: 45 },
      repos,
    );

    expect(result.programComplete).toBe(true);

    const saved = await repos.programs.findById(program.id);
    expect(saved?.completedAt).not.toBeNull();
  });
});

// ─── skipSession ──────────────────────────────────────────────────────────────

describe('skipSession', () => {
  it('saves a skipped record and advances position', async () => {
    const repos = createInMemoryRepositories();
    const program = await createProgram({ config: minimalWorkoutProgram }, repos);

    const record = await skipSession(program.id, 'Traveling for work', repos);

    expect(record.skipped).toBe(true);
    expect(record.skipReason).toBe('Traveling for work');
    expect(record.activities).toHaveLength(0);

    const position = await repos.positions.findByProgramId(program.id);
    expect(position?.currentSessionOrdinal).toBe(1);
  });
});
