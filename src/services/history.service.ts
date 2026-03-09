/**
 * History service — querying past sessions for display and AI context.
 */

import type { SessionRecord, CoachingNote } from '../core/schemas.js';
import type { Repositories } from '../db/repository.js';

export interface SessionSummary {
  record: SessionRecord;
  notes: CoachingNote[];
}

export async function getRecentSessions(
  programId: string,
  limit: number,
  repos: Repositories,
): Promise<SessionSummary[]> {
  const records = await repos.sessions.findByProgram(programId, limit);
  const summaries = await Promise.all(
    records.map(async (record) => ({
      record,
      notes: await repos.notes.findBySessionId(record.id),
    })),
  );
  return summaries;
}

export async function getSessionById(
  id: string,
  repos: Repositories,
): Promise<SessionSummary | null> {
  const record = await repos.sessions.findById(id);
  if (!record) return null;
  const notes = await repos.notes.findBySessionId(id);
  return { record, notes };
}
