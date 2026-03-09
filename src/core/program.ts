/**
 * Program traversal — pure functions for navigating program structure.
 * No I/O. Inputs are validated ProgramConfig and ProgramPosition.
 */

import type { ProgramConfig, CycleTemplate, SessionTemplate, ProgramPosition } from './schemas.js';

export interface CurrentSession {
  cycle: CycleTemplate;
  session: SessionTemplate;
  cycleOrdinal: number;
  sessionOrdinal: number;
  isLastSessionInCycle: boolean;
  isLastCycle: boolean;
}

/**
 * Returns the current session based on program position.
 * Throws if the position is out of bounds.
 */
export function currentSession(
  config: ProgramConfig,
  position: Pick<ProgramPosition, 'currentCycleOrdinal' | 'currentSessionOrdinal'>,
): CurrentSession {
  const cycle = config.cycles.find((c) => c.ordinal === position.currentCycleOrdinal);
  if (!cycle) {
    throw new Error(
      `Cycle ordinal ${position.currentCycleOrdinal} not found in program '${config.name}'`,
    );
  }

  const session = cycle.sessions[position.currentSessionOrdinal];
  if (!session) {
    throw new Error(
      `Session ordinal ${position.currentSessionOrdinal} not found in cycle '${cycle.label}'`,
    );
  }

  const isLastSessionInCycle = position.currentSessionOrdinal === cycle.sessions.length - 1;
  const maxCycleOrdinal = Math.max(...config.cycles.map((c) => c.ordinal));
  const isLastCycle = position.currentCycleOrdinal === maxCycleOrdinal && isLastSessionInCycle;

  return {
    cycle,
    session,
    cycleOrdinal: position.currentCycleOrdinal,
    sessionOrdinal: position.currentSessionOrdinal,
    isLastSessionInCycle,
    isLastCycle,
  };
}

/**
 * Computes the next position after completing a session.
 * Handles cycle rollover and program completion.
 */
export function advancePosition(
  config: ProgramConfig,
  position: Pick<ProgramPosition, 'currentCycleOrdinal' | 'currentSessionOrdinal'>,
): { cycleOrdinal: number; sessionOrdinal: number; programComplete: boolean } {
  const cycle = config.cycles.find((c) => c.ordinal === position.currentCycleOrdinal);
  if (!cycle) {
    throw new Error(`Cycle ordinal ${position.currentCycleOrdinal} not found`);
  }

  const isLastSessionInCycle = position.currentSessionOrdinal === cycle.sessions.length - 1;

  if (!isLastSessionInCycle) {
    return {
      cycleOrdinal: position.currentCycleOrdinal,
      sessionOrdinal: position.currentSessionOrdinal + 1,
      programComplete: false,
    };
  }

  // End of cycle — find next cycle by ordinal
  const sortedOrdinals = config.cycles.map((c) => c.ordinal).sort((a, b) => a - b);
  const currentIndex = sortedOrdinals.indexOf(position.currentCycleOrdinal);
  const nextOrdinal = sortedOrdinals[currentIndex + 1];

  if (nextOrdinal === undefined) {
    return {
      cycleOrdinal: position.currentCycleOrdinal,
      sessionOrdinal: position.currentSessionOrdinal,
      programComplete: true,
    };
  }

  return {
    cycleOrdinal: nextOrdinal,
    sessionOrdinal: 0,
    programComplete: false,
  };
}

/**
 * Returns a human-readable description of a session's position in the program.
 * e.g. "Week 2, Day 3 of 4"
 */
export function positionLabel(config: ProgramConfig, position: Pick<ProgramPosition, 'currentCycleOrdinal' | 'currentSessionOrdinal'>): string {
  const cycle = config.cycles.find((c) => c.ordinal === position.currentCycleOrdinal);
  const session = cycle?.sessions[position.currentSessionOrdinal];
  if (!cycle || !session) return 'Unknown position';

  return `${cycle.label} — ${session.label} (${position.currentSessionOrdinal + 1} of ${cycle.sessions.length})`;
}
