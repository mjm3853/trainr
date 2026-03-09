import type { ProgramConfig } from '../../src/core/schemas.js';

export const minimalWorkoutProgram: ProgramConfig = {
  name: 'Test Workout Program',
  domain: 'workout',
  goalStatement: 'Get stronger',
  settings: {
    unit: 'lbs',
    trainingMaxes: { squat: 200, bench: 150, deadlift: 250, press: 100 },
    roundingIncrement: 5,
  },
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
          label: 'Squat Day',
          estimatedDuration: 60,
          notes: 'Main squats',
          activities: [
            {
              id: 'squat_main',
              name: 'Back Squat',
              category: 'main_lift',
              metric: { kind: 'load_reps', unit: 'lbs' },
              progressionRuleId: 'workout.wendler_main',
              config: { lift: 'squat', weekScheme: '5s' },
            },
          ],
        },
        {
          id: 'day2',
          label: 'Bench Day',
          estimatedDuration: 60,
          notes: 'Main bench',
          activities: [
            {
              id: 'bench_main',
              name: 'Bench Press',
              category: 'main_lift',
              metric: { kind: 'load_reps', unit: 'lbs' },
              progressionRuleId: 'workout.wendler_main',
              config: { lift: 'bench', weekScheme: '5s' },
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
          label: 'Squat Day',
          estimatedDuration: 60,
          notes: '',
          activities: [
            {
              id: 'squat_main_w2',
              name: 'Back Squat',
              category: 'main_lift',
              metric: { kind: 'load_reps', unit: 'lbs' },
              progressionRuleId: 'workout.wendler_main',
              config: { lift: 'squat', weekScheme: '3s' },
            },
          ],
        },
      ],
    },
  ],
};
