/**
 * Stew Smith Pull-up Progression Rules
 *
 * Based on Stew Smith's methodology for building pull-up strength:
 * - Progressive rep increases every session
 * - Multiple training days per week
 * - Phase-based progression (Foundation → Build → Strength → Peak)
 * - Quality-focused training with proper form requirements
 */

import type { ProgressionRule, ProgressionParams } from '../../../core/progression.js';
import type { ActivityTarget } from '../../../core/schemas.js';

export const stewSmithPullupRule: ProgressionRule = {
  id: 'workout.stew_smith_pullups',
  domain: 'workout',

  compute(params: ProgressionParams): ActivityTarget {
    const { phase, sessionNumber, exercise } = params.template.config as {
      phase: string;
      sessionNumber: number;
      exercise: string;
    };

    // Get current max pull-ups from settings
    const currentMax = (params.programSettings as any).currentMaxPullups || 0;

    // Calculate target reps based on phase and session
    const targetReps = calculateTargetReps(phase, sessionNumber, currentMax, exercise);

    return {
      planned: {
        kind: 'reps_only',
        reps: targetReps,
      },
      sets: calculateSets(phase, sessionNumber),
      note: getProgressionNote(phase, sessionNumber, targetReps),
    };
  },
};

export const stewSmithAssistanceRule: ProgressionRule = {
  id: 'workout.stew_smith_assistance',
  domain: 'workout',

  compute(params: ProgressionParams): ActivityTarget {
    const { exercise, phase, sessionNumber } = params.template.config as {
      exercise: string;
      phase: string;
      sessionNumber: number;
    };

    const targetReps = calculateAssistanceReps(exercise, phase, sessionNumber);
    const sets = calculateAssistanceSets(exercise, phase);

    return {
      planned: {
        kind: 'reps_only',
        reps: targetReps,
      },
      sets,
      note: getAssistanceNote(exercise, phase),
    };
  },
};

function calculateTargetReps(phase: string, sessionNumber: number, currentMax: number, exercise: string): number {
  // Base targets on current max and phase
  let baseReps: number;

  switch (phase) {
    case 'foundation':
      // Start with assisted work, build to 3-5 strict pull-ups
      baseReps = Math.max(1, Math.min(5, currentMax + 1));
      break;

    case 'build':
      // Build to 8-12 strict pull-ups
      baseReps = Math.max(3, Math.min(12, currentMax + 2));
      break;

    case 'strength':
      // Build to 15+ pull-ups, add weight when possible
      baseReps = Math.max(8, Math.min(20, currentMax + 3));
      break;

    case 'peak':
      // Max effort sessions
      baseReps = Math.max(10, currentMax + 5);
      break;

    case 'deload':
      // Recovery week - 50-60% of recent max
      baseReps = Math.max(3, Math.floor(currentMax * 0.6));
      break;

    default:
      baseReps = 5;
  }

  // Adjust for session number (slight progression within week)
  const sessionAdjustment = Math.floor(sessionNumber / 2);
  return Math.max(1, baseReps + sessionAdjustment);
}

function calculateSets(phase: string, sessionNumber: number): number {
  switch (phase) {
    case 'foundation':
      return 3; // 3 sets for beginners
    case 'build':
      return 4; // 4 sets for building volume
    case 'strength':
      return 5; // 5 sets for strength focus
    case 'peak':
      return 3; // 3 sets max effort
    case 'deload':
      return 3; // 3 sets recovery
    default:
      return 3;
  }
}

function calculateAssistanceReps(exercise: string, phase: string, sessionNumber: number): number {
  const baseReps: Record<string, number> = {
    negative: 5,
    rows: 10,
    l_pullup: 6,
    weighted_negative: 3,
    close_grip: 8,
    assisted: 8,
  };

  let reps = baseReps[exercise] || 5;

  // Adjust based on phase
  switch (phase) {
    case 'foundation':
      reps = Math.floor(reps * 0.8); // Easier for beginners
      break;
    case 'build':
      reps = Math.floor(reps * 1.0); // Standard
      break;
    case 'strength':
      reps = Math.floor(reps * 1.2); // Harder for advanced
      break;
    case 'peak':
      reps = Math.floor(reps * 1.1); // Slightly harder
      break;
    case 'deload':
      reps = Math.floor(reps * 0.6); // Much easier
      break;
  }

  return Math.max(1, reps);
}

function calculateAssistanceSets(exercise: string, phase: string): number {
  const baseSets: Record<string, number> = {
    negative: 3,
    rows: 3,
    l_pullup: 3,
    weighted_negative: 3,
    close_grip: 3,
    assisted: 3,
  };

  let sets = baseSets[exercise] || 3;

  // Adjust for deload
  if (phase === 'deload') {
    sets = Math.max(2, sets - 1);
  }

  return sets;
}

function getProgressionNote(phase: string, sessionNumber: number, targetReps: number): string {
  const phaseNotes: Record<string, string> = {
    foundation: 'Focus on form. Use assistance if needed. Build proper pulling mechanics.',
    build: 'Increase reps gradually. Add weight when you can do 10+ strict pull-ups.',
    strength: 'Push for max reps. Use weighted negatives for additional challenge.',
    peak: 'Test your limits. Focus on recovery between sessions.',
    deload: 'Light recovery week. Maintain form, reduce volume.',
  };

  return `${phaseNotes[phase] || ''} Target: ${targetReps} reps. Rest 2-3 min between sets.`;
}

function getAssistanceNote(exercise: string, phase: string): string {
  const exerciseNotes: Record<string, string> = {
    negative: 'Jump to top position, lower slowly (3-5 seconds).',
    rows: 'Body parallel to ground, pull chest to bar.',
    l_pullup: 'Pull-up with legs in L-position for added difficulty.',
    weighted_negative: 'Add weight, focus on controlled descent.',
    close_grip: 'Hands shoulder-width, palms facing away.',
    assisted: 'Use bands or machine for support.',
  };

  const phaseModifier = phase === 'deload' ? ' (Recovery pace)' : '';

  return `${exerciseNotes[exercise] || ''}${phaseModifier}`;
}