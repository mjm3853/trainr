/**
 * Stew Smith Pull-Up Program
 *
 * Based on Stew Smith's military fitness methodology for building pull-up strength.
 * Focuses on progressive overload with multiple training days per week.
 *
 * Program Structure:
 * - 3 training days per week (Mon/Wed/Fri)
 * - Progressive rep increases every session
 * - Multiple pull-up variations for comprehensive development
 * - 8-week program with deload week
 *
 * Key Principles:
 * - Quality over quantity — perfect form required
 * - Progressive overload with small, consistent increases
 * - Multiple sessions per week for faster gains
 * - Recovery focus with strategic deload
 */

import type { ProgramConfig, ActivityTemplate } from '../../../core/schemas.js';

const PHASES = ['foundation', 'build', 'strength', 'peak', 'deload'] as const;
type Phase = typeof PHASES[number];

/** Inline activity definition — matches ActivityTemplate shape without requiring an id schema. */
type ActivityDef = Omit<ActivityTemplate, 'config'> & { config: Record<string, unknown> };

function pullupSession(phase: Phase, sessionNumber: number): ActivityDef[] {
  const activities: ActivityDef[] = [];

  // Main pull-up work - varies by phase
  const mainPullup = getMainPullupActivity(phase, sessionNumber);
  if (mainPullup) {
    activities.push(mainPullup);
  }

  // Assistance work - varies by phase
  const assistanceWork = getAssistanceActivities(phase, sessionNumber);
  activities.push(...assistanceWork);

  return activities;
}

function getMainPullupActivity(phase: Phase, sessionNumber: number): ActivityDef | null {
  const baseConfig = {
    progressionRuleId: 'workout.stew_smith_pullups' as const,
    config: { phase, sessionNumber, exercise: 'strict' as const },
  };

  switch (phase) {
    case 'foundation':
      return {
        id: `pullup_foundation_${sessionNumber}`,
        name: 'Pull-ups (Assisted or Negative)',
        category: 'main_lift',
        metric: { kind: 'reps_only' as const },
        ...baseConfig,
      };

    case 'build':
      return {
        id: `pullup_build_${sessionNumber}`,
        name: 'Pull-ups (Strict)',
        category: 'main_lift',
        metric: { kind: 'reps_only' as const },
        ...baseConfig,
      };

    case 'strength':
      return {
        id: `pullup_strength_${sessionNumber}`,
        name: 'Pull-ups (Strict + Weighted)',
        category: 'main_lift',
        metric: { kind: 'reps_only' as const },
        ...baseConfig,
      };

    case 'peak':
      return {
        id: `pullup_peak_${sessionNumber}`,
        name: 'Pull-ups (Max Effort)',
        category: 'main_lift',
        metric: { kind: 'reps_only' as const },
        ...baseConfig,
      };

    case 'deload':
      return {
        id: `pullup_deload_${sessionNumber}`,
        name: 'Pull-ups (Recovery)',
        category: 'main_lift',
        metric: { kind: 'reps_only' as const },
        ...baseConfig,
      };

    default:
      return null;
  }
}

function getAssistanceActivities(phase: Phase, sessionNumber: number): ActivityDef[] {
  const activities: ActivityDef[] = [];

  // Add assistance exercises based on phase
  switch (phase) {
    case 'foundation':
      activities.push(
        {
          id: `negative_pullups_${sessionNumber}`,
          name: 'Negative Pull-ups',
          category: 'assistance',
          metric: { kind: 'reps_only' as const },
          progressionRuleId: 'workout.stew_smith_assistance',
          config: { exercise: 'negative', phase, sessionNumber },
        },
        {
          id: `inverted_rows_${sessionNumber}`,
          name: 'Inverted Rows',
          category: 'assistance',
          metric: { kind: 'reps_only' as const },
          progressionRuleId: 'workout.stew_smith_assistance',
          config: { exercise: 'rows', phase, sessionNumber },
        }
      );
      break;

    case 'build':
      activities.push(
        {
          id: `pullup_negatives_${sessionNumber}`,
          name: 'Negative Pull-ups',
          category: 'assistance',
          metric: { kind: 'reps_only' as const },
          progressionRuleId: 'workout.stew_smith_assistance',
          config: { exercise: 'negative', phase, sessionNumber },
        },
        {
          id: `l_pullups_${sessionNumber}`,
          name: 'L-Pull-ups',
          category: 'assistance',
          metric: { kind: 'reps_only' as const },
          progressionRuleId: 'workout.stew_smith_assistance',
          config: { exercise: 'l_pullup', phase, sessionNumber },
        }
      );
      break;

    case 'strength':
    case 'peak':
      activities.push(
        {
          id: `weighted_negatives_${sessionNumber}`,
          name: 'Weighted Negative Pull-ups',
          category: 'assistance',
          metric: { kind: 'reps_only' as const },
          progressionRuleId: 'workout.stew_smith_assistance',
          config: { exercise: 'weighted_negative', phase, sessionNumber },
        },
        {
          id: `close_grip_pullups_${sessionNumber}`,
          name: 'Close-Grip Pull-ups',
          category: 'assistance',
          metric: { kind: 'reps_only' as const },
          progressionRuleId: 'workout.stew_smith_assistance',
          config: { exercise: 'close_grip', phase, sessionNumber },
        }
      );
      break;

    case 'deload':
      activities.push(
        {
          id: `assisted_pullups_${sessionNumber}`,
          name: 'Assisted Pull-ups',
          category: 'assistance',
          metric: { kind: 'reps_only' as const },
          progressionRuleId: 'workout.stew_smith_assistance',
          config: { exercise: 'assisted', phase, sessionNumber },
        }
      );
      break;
  }

  return activities;
}

export function createStewSmithPullupProgram(options: {
  currentMaxPullups: number;
  sessionsPerWeek?: 3 | 4;
  includeAssistance?: boolean;
}): ProgramConfig {
  const { currentMaxPullups, sessionsPerWeek = 3, includeAssistance = true } = options;

  // Determine starting phase based on current ability
  let startingPhase: Phase;
  if (currentMaxPullups === 0) {
    startingPhase = 'foundation';
  } else if (currentMaxPullups < 5) {
    startingPhase = 'foundation';
  } else if (currentMaxPullups < 10) {
    startingPhase = 'build';
  } else if (currentMaxPullups < 15) {
    startingPhase = 'strength';
  } else {
    startingPhase = 'peak';
  }

  // Create 8-week program with progression
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekNumber = i + 1;
    let phase: Phase;

    // Phase progression: Foundation (2w) → Build (3w) → Strength (2w) → Peak (1w) → Deload (1w)
    if (weekNumber <= 2) {
      phase = 'foundation';
    } else if (weekNumber <= 5) {
      phase = 'build';
    } else if (weekNumber <= 7) {
      phase = 'strength';
    } else if (weekNumber === 8) {
      phase = 'peak';
    } else {
      phase = 'deload';
    }

    const sessions = Array.from({ length: sessionsPerWeek }, (_, sessionIndex) => ({
      id: `pullup_session_${weekNumber}_${sessionIndex + 1}`,
      label: `Day ${sessionIndex + 1} — Pull-up Training`,
      estimatedDuration: 45,
      notes: getSessionNotes(phase, sessionIndex + 1),
      activities: pullupSession(phase, sessionIndex + 1),
    }));

    return {
      id: `week_${weekNumber}`,
      label: `Week ${weekNumber} — ${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase`,
      ordinal: i,
      repeatCount: 1,
      progressionPhase: phase === 'deload' ? 'deload' : 'intensification',
      sessions,
    };
  });

  return {
    name: `Stew Smith Pull-Up Program (${sessionsPerWeek}x/week)`,
    domain: 'workout',
    goalStatement: 'Build pull-up strength and endurance using proven military training methods',
    settings: {
      unit: 'bodyweight',
      trainingMaxes: {
        pullup: currentMaxPullups,
      },
      roundingIncrement: 1,
      currentMaxPullups,
      sessionsPerWeek,
      includeAssistance,
    },
    cycles: weeks,
  };
}

function getSessionNotes(phase: Phase, sessionNumber: number): string {
  const baseNotes = 'Focus on perfect form. Rest 2-3 minutes between sets. Quality over quantity.';

  switch (phase) {
    case 'foundation':
      return `${baseNotes} Use assistance as needed. Build proper pulling mechanics.`;
    case 'build':
      return `${baseNotes} Increase reps gradually. Add weight when you can do 10+ strict pull-ups.`;
    case 'strength':
      return `${baseNotes} Push for max reps. Use weighted negatives for additional challenge.`;
    case 'peak':
      return `${baseNotes} Test your limits. Focus on recovery between sessions.`;
    case 'deload':
      return `${baseNotes} Light recovery week. Maintain form, reduce volume.`;
    default:
      return baseNotes;
  }
}