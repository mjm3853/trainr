/**
 * In-memory repository implementations — used in tests.
 * No database, no I/O. Backed by plain Maps.
 */

import type {
  ProgramRecord,
  ProgramPosition,
  SessionRecord,
  CoachingNote,
} from '../../../core/schemas.js';
import type {
  ProgramRepository,
  ProgramPositionRepository,
  SessionRepository,
  CoachingNoteRepository,
  Repositories,
} from '../../repository.js';

export class InMemoryProgramRepository implements ProgramRepository {
  private store = new Map<string, ProgramRecord>();

  async findById(id: string): Promise<ProgramRecord | null> {
    return this.store.get(id) ?? null;
  }

  async findActive(): Promise<ProgramRecord[]> {
    return [...this.store.values()].filter((p) => p.completedAt === null);
  }

  async save(program: ProgramRecord): Promise<void> {
    this.store.set(program.id, program);
  }

  async update(
    id: string,
    patch: Partial<Pick<ProgramRecord, 'completedAt' | 'startedAt'>>,
  ): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Program '${id}' not found`);
    this.store.set(id, { ...existing, ...patch });
  }
}

export class InMemoryProgramPositionRepository implements ProgramPositionRepository {
  private store = new Map<string, ProgramPosition>();

  async findByProgramId(programId: string): Promise<ProgramPosition | null> {
    return this.store.get(programId) ?? null;
  }

  async save(position: ProgramPosition): Promise<void> {
    this.store.set(position.programId, position);
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private store = new Map<string, SessionRecord>();

  async findById(id: string): Promise<SessionRecord | null> {
    return this.store.get(id) ?? null;
  }

  async findByProgram(programId: string, limit?: number): Promise<SessionRecord[]> {
    const results = [...this.store.values()]
      .filter((s) => s.programId === programId)
      .sort((a, b) => {
        const aTime = a.completedAt?.getTime() ?? 0;
        const bTime = b.completedAt?.getTime() ?? 0;
        return bTime - aTime;
      });
    return limit ? results.slice(0, limit) : results;
  }

  async findRecentByDomain(_domain: string, limit: number): Promise<SessionRecord[]> {
    // In-memory: domain filtering would require program lookup — simplified here
    return [...this.store.values()]
      .sort((a, b) => {
        const aTime = a.completedAt?.getTime() ?? 0;
        const bTime = b.completedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  async save(record: SessionRecord): Promise<void> {
    this.store.set(record.id, record);
  }
}

export class InMemoryCoachingNoteRepository implements CoachingNoteRepository {
  private store = new Map<string, CoachingNote[]>();

  async findBySessionId(sessionId: string): Promise<CoachingNote[]> {
    return this.store.get(sessionId) ?? [];
  }

  async save(note: CoachingNote): Promise<void> {
    const existing = this.store.get(note.sessionId) ?? [];
    this.store.set(note.sessionId, [...existing, note]);
  }
}

export function createInMemoryRepositories(): Repositories {
  return {
    programs: new InMemoryProgramRepository(),
    positions: new InMemoryProgramPositionRepository(),
    sessions: new InMemorySessionRepository(),
    notes: new InMemoryCoachingNoteRepository(),
  };
}
