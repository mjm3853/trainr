import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryRepositories } from '../../src/db/repositories/memory/index.js';
import { getRecentSessions, getSessionById } from '../../src/services/history.service.js';
import type { Repositories } from '../../src/db/repository.js';
import type { SessionRecord, CoachingNote } from '../../src/core/schemas.js';

const PROGRAM_ID = '00000000-0000-4000-8000-000000000001';
const SESSION_ID_1 = '00000000-0000-4000-8000-000000000010';
const SESSION_ID_2 = '00000000-0000-4000-8000-000000000020';
const NOTE_ID = '00000000-0000-4000-8000-000000000099';

function makeSessionRecord(overrides: Partial<SessionRecord> & { id: string }): SessionRecord {
  return {
    programId: PROGRAM_ID,
    templateId: 'day1',
    cycleOrdinal: 0,
    sessionOrdinal: 0,
    completedAt: new Date('2026-03-01T12:00:00Z'),
    durationMinutes: 60,
    context: null,
    activities: [],
    userNotes: '',
    skipped: false,
    skipReason: null,
    ...overrides,
  };
}

describe('history service', () => {
  let repos: Repositories;

  beforeEach(async () => {
    repos = createInMemoryRepositories();

    await repos.sessions.save(makeSessionRecord({ id: SESSION_ID_1, sessionOrdinal: 0 }));
    await repos.sessions.save(
      makeSessionRecord({
        id: SESSION_ID_2,
        sessionOrdinal: 1,
        completedAt: new Date('2026-03-02T12:00:00Z'),
      }),
    );

    const note: CoachingNote = {
      id: NOTE_ID,
      sessionId: SESSION_ID_1,
      phase: 'post',
      content: 'Good session, maintained form.',
      adjustments: [],
      generatedAt: new Date('2026-03-01T13:00:00Z'),
      source: 'ai',
    };
    await repos.notes.save(note);
  });

  describe('getRecentSessions', () => {
    it('returns records with notes', async () => {
      const summaries = await getRecentSessions(PROGRAM_ID, 10, repos);
      expect(summaries).toHaveLength(2);

      const withNotes = summaries.find((s) => s.record.id === SESSION_ID_1);
      expect(withNotes).toBeDefined();
      expect(withNotes!.notes).toHaveLength(1);
      expect(withNotes!.notes[0].content).toBe('Good session, maintained form.');
    });
  });

  describe('getSessionById', () => {
    it('returns null for missing ID', async () => {
      const result = await getSessionById('00000000-0000-4000-8000-999999999999', repos);
      expect(result).toBeNull();
    });

    it('returns summary for existing record', async () => {
      const result = await getSessionById(SESSION_ID_1, repos);
      expect(result).not.toBeNull();
      expect(result!.record.id).toBe(SESSION_ID_1);
      expect(result!.notes).toHaveLength(1);
    });
  });
});
