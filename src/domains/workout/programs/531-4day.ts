/**
 * Wendler 5/3/1 — 4-day split (original)
 *
 * Week 1 (5s): 65%×5, 75%×5, 85%×AMRAP
 * Week 2 (3s): 70%×3, 80%×3, 90%×AMRAP
 * Week 3 (1s): 75%×5, 85%×3, 95%×AMRAP
 * Week 4 (deload): 40%×5, 50%×5, 60%×5
 *
 * Sessions: Squat+Press, Deadlift+Bench (alternating days)
 * After each 4-week cycle: +10lbs lower TM, +5lbs upper TM
 *
 * BBB supplemental is optional — controlled by program settings.
 */

import type { ProgramConfig } from '../../../core/schemas.js';

const WEEK_SCHEMES = ['5s', '3s', '1s', 'deload'] as const;
type WeekScheme = typeof WEEK_SCHEMES[number];

function squatPressSession(weekScheme: WeekScheme, includeBBB: boolean) {
  const activities = [
    {
      id: `squat_main_${weekScheme}`,
      name: 'Back Squat',
      category: 'main_lift',
      metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
      progressionRuleId: 'workout.wendler_main',
      config: { lift: 'squat', weekScheme },
    },
    {
      id: `press_main_${weekScheme}`,
      name: 'Overhead Press',
      category: 'main_lift',
      metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
      progressionRuleId: 'workout.wendler_main',
      config: { lift: 'press', weekScheme },
    },
  ];

  if (includeBBB) {
    activities.push(
      {
        id: `squat_bbb_${weekScheme}`,
        name: 'Back Squat (BBB)',
        category: 'supplemental',
        metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
        progressionRuleId: 'workout.wendler_bbb',
        config: { lift: 'squat', sets: 5, reps: 10, percentage: 0.5 },
      },
      {
        id: `press_bbb_${weekScheme}`,
        name: 'Overhead Press (BBB)',
        category: 'supplemental',
        metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
        progressionRuleId: 'workout.wendler_bbb',
        config: { lift: 'press', sets: 5, reps: 10, percentage: 0.5 },
      },
    );
  }

  return activities;
}

function deadliftBenchSession(weekScheme: WeekScheme, includeBBB: boolean) {
  const activities = [
    {
      id: `deadlift_main_${weekScheme}`,
      name: 'Deadlift',
      category: 'main_lift',
      metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
      progressionRuleId: 'workout.wendler_main',
      config: { lift: 'deadlift', weekScheme },
    },
    {
      id: `bench_main_${weekScheme}`,
      name: 'Bench Press',
      category: 'main_lift',
      metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
      progressionRuleId: 'workout.wendler_main',
      config: { lift: 'bench', weekScheme },
    },
  ];

  if (includeBBB) {
    activities.push(
      {
        id: `deadlift_bbb_${weekScheme}`,
        name: 'Deadlift (BBB)',
        category: 'supplemental',
        metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
        progressionRuleId: 'workout.wendler_bbb',
        config: { lift: 'deadlift', sets: 5, reps: 10, percentage: 0.5 },
      },
      {
        id: `bench_bbb_${weekScheme}`,
        name: 'Bench Press (BBB)',
        category: 'supplemental',
        metric: { kind: 'load_reps' as const, unit: 'lbs' as const },
        progressionRuleId: 'workout.wendler_bbb',
        config: { lift: 'bench', sets: 5, reps: 10, percentage: 0.5 },
      },
    );
  }

  return activities;
}

export function create531Program(options: {
  squatTM: number;
  benchTM: number;
  deadliftTM: number;
  pressTM: number;
  includeBBB?: boolean;
  unit?: 'lbs' | 'kg';
}): ProgramConfig {
  const { includeBBB = false, unit = 'lbs' } = options;

  const weeks = WEEK_SCHEMES.map((scheme, i) => ({
    id: `week_${i + 1}`,
    label: `Week ${i + 1} — ${scheme === 'deload' ? 'Deload' : scheme.toUpperCase()}`,
    ordinal: i,
    repeatCount: 1,
    progressionPhase: scheme === 'deload' ? 'deload' : 'intensification',
    sessions: [
      {
        id: `squat_press_${scheme}`,
        label: 'Day A — Squat / Press',
        estimatedDuration: includeBBB ? 75 : 55,
        notes: scheme === 'deload'
          ? 'Light deload week — focus on form and recovery. No AMRAP sets.'
          : 'Complete all main sets. Last set is AMRAP — push for maximum quality reps.',
        activities: squatPressSession(scheme, includeBBB),
      },
      {
        id: `deadlift_bench_${scheme}`,
        label: 'Day B — Deadlift / Bench',
        estimatedDuration: includeBBB ? 75 : 55,
        notes: scheme === 'deload'
          ? 'Light deload week — focus on form and recovery. No AMRAP sets.'
          : 'Complete all main sets. Last set is AMRAP — push for maximum quality reps.',
        activities: deadliftBenchSession(scheme, includeBBB),
      },
    ],
  }));

  return {
    name: `Wendler 5/3/1${includeBBB ? ' + BBB' : ''} — 4-Day`,
    domain: 'workout',
    goalStatement: 'Build strength through wave loading and progressive overload',
    settings: {
      unit,
      trainingMaxes: {
        squat: options.squatTM,
        bench: options.benchTM,
        deadlift: options.deadliftTM,
        press: options.pressTM,
      },
      roundingIncrement: unit === 'lbs' ? 5 : 2.5,
      includeBBB,
    },
    cycles: weeks,
  };
}
