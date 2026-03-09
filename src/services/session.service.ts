/**
 * Session service — the core orchestration layer.
 * Resolves progression rules, optionally calls AI coach, and persists records.
 */

import { v4 as uuid } from 'uuid';
import type { SessionRecord, SessionContext, CoachingNote, ActivityRecord, ActivityTarget } from '../core/schemas.js';
import { currentSession, advancePosition } from '../core/program.js';
import { resolveRule } from '../core/progression.js';
import { getDomain } from '../core/domain.js';
import type { CoachFn, CoachInput } from '../ai/coach.js';
import { nullCoach } from '../ai/coach.js';
import type { Repositories } from '../db/repository.js';
import {
  parseProgramConfig,
  getProgramById,
  getProgramPosition,
  advanceProgramPosition,
  completeProgram,
} from './program.service.js';

// ─── Plan Session ─────────────────────────────────────────────────────────────

export interface PlannedSession {
  programId: string;
  session: ReturnType<typeof currentSession>;
  resolvedTargets: ActivityTarget[];
  coachingNote: CoachingNote | null;
}

/**
 * Load the next planned session with resolved activity targets.
 * Optionally calls the AI coach if context is provided.
 */
export async function planSession(
  programId: string,
  repos: Repositories,
  options: {
    context?: SessionContext;
    userMessage?: string;
    coach?: CoachFn;
  } = {},
): Promise<PlannedSession> {
  const program = await getProgramById(programId, repos);
  if (!program) throw new Error(`Program '${programId}' not found`);

  const position = await getProgramPosition(programId, repos);
  if (!position) throw new Error(`No position found for program '${programId}'`);

  const config = parseProgramConfig(program);
  const sessionInfo = currentSession(config, position);

  // Resolve progression targets for each activity
  const recentHistory = await repos.sessions.findByProgram(programId, 10);
  const resolvedTargets: ActivityTarget[] = sessionInfo.session.activities.map((template) => {
    const rule = resolveRule(template.progressionRuleId);
    const history: ActivityRecord[] = recentHistory
      .flatMap((s) => s.activities)
      .filter((a) => a.templateId === template.id);

    return rule.compute({
      template,
      history,
      programSettings: program.settings,
      cycleOrdinal: position.currentCycleOrdinal,
      sessionOrdinal: position.currentSessionOrdinal,
    });
  });

  // Optionally call AI coach
  let coachingNote: CoachingNote | null = null;
  if (options.context || options.userMessage) {
    const domain = getDomain(program.domain);
    const domainContext = domain.contextForAI(program.settings, options.context ?? null);

    const historySummaries = recentHistory.slice(0, 5).map((s) => {
      const activityPairs = s.activities.map((record) => {
        const template = config.cycles
          .flatMap((c) => c.sessions)
          .flatMap((sess) => sess.activities)
          .find((a) => a.id === record.templateId);

        return template ? { template, record } : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null);

      return {
        completedAt: s.completedAt,
        summary: domain.summarizeSession(activityPairs),
        context: s.context,
      };
    });

    const coachInput: CoachInput = {
      program,
      currentSession: sessionInfo.session,
      recentHistory: historySummaries,
      context: options.context ?? null,
      domainContext,
      userMessage: options.userMessage ?? null,
    };

    const coachFn = options.coach ?? nullCoach;
    const output = await coachFn(coachInput);

    if (output.narrative) {
      coachingNote = {
        id: uuid(),
        sessionId: uuid(), // temp ID — updated when session is saved
        phase: 'pre',
        content: output.narrative,
        adjustments: output.adjustments,
        generatedAt: new Date(),
        source: 'ai',
      };
    }
  }

  return { programId, session: sessionInfo, resolvedTargets, coachingNote };
}

// ─── Log Session ──────────────────────────────────────────────────────────────

export interface LogSessionInput {
  programId: string;
  plannedSession: PlannedSession;
  activities: ActivityRecord[];
  durationMinutes?: number;
  context?: SessionContext;
  userNotes?: string;
}

export async function logSession(
  input: LogSessionInput,
  repos: Repositories,
): Promise<{ record: SessionRecord; advanced: boolean; programComplete: boolean }> {
  const program = await getProgramById(input.programId, repos);
  if (!program) throw new Error(`Program '${input.programId}' not found`);

  const position = await getProgramPosition(input.programId, repos);
  if (!position) throw new Error(`No position found for program '${input.programId}'`);

  const sessionId = uuid();
  const record: SessionRecord = {
    id: sessionId,
    programId: input.programId,
    templateId: input.plannedSession.session.session.id,
    cycleOrdinal: input.plannedSession.session.cycleOrdinal,
    sessionOrdinal: input.plannedSession.session.sessionOrdinal,
    completedAt: new Date(),
    durationMinutes: input.durationMinutes ?? null,
    context: input.context ?? input.plannedSession.coachingNote ? (input.context ?? null) : null,
    activities: input.activities,
    userNotes: input.userNotes ?? '',
    skipped: false,
    skipReason: null,
  };

  await repos.sessions.save(record);

  // Save pre-session coaching note if present
  if (input.plannedSession.coachingNote) {
    const note: CoachingNote = {
      ...input.plannedSession.coachingNote,
      sessionId,
    };
    await repos.notes.save(note);
  }

  // Advance program position
  const config = parseProgramConfig(program);
  const next = advancePosition(config, position);

  if (!next.programComplete) {
    await advanceProgramPosition(input.programId, repos, {
      cycleOrdinal: next.cycleOrdinal,
      sessionOrdinal: next.sessionOrdinal,
    });
  } else {
    await completeProgram(input.programId, repos);
  }

  return { record, advanced: true, programComplete: next.programComplete };
}

// ─── Skip Session ─────────────────────────────────────────────────────────────

export async function skipSession(
  programId: string,
  reason: string,
  repos: Repositories,
): Promise<SessionRecord> {
  const program = await getProgramById(programId, repos);
  if (!program) throw new Error(`Program '${programId}' not found`);

  const position = await getProgramPosition(programId, repos);
  if (!position) throw new Error(`No position found for program '${programId}'`);

  const config = parseProgramConfig(program);
  const sessionInfo = currentSession(config, position);

  const record: SessionRecord = {
    id: uuid(),
    programId,
    templateId: sessionInfo.session.id,
    cycleOrdinal: sessionInfo.cycleOrdinal,
    sessionOrdinal: sessionInfo.sessionOrdinal,
    completedAt: null,
    durationMinutes: null,
    context: null,
    activities: [],
    userNotes: '',
    skipped: true,
    skipReason: reason,
  };

  await repos.sessions.save(record);

  // Advance past the skipped session
  const next = advancePosition(config, position);
  if (!next.programComplete) {
    await advanceProgramPosition(programId, repos, {
      cycleOrdinal: next.cycleOrdinal,
      sessionOrdinal: next.sessionOrdinal,
    });
  }

  return record;
}
