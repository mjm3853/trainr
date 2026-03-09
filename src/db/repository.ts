/**
 * Repository interfaces — services depend on these, not Drizzle directly.
 * This enables in-memory test doubles and future storage backend swaps.
 */

import type {
  ProgramRecord,
  ProgramPosition,
  SessionRecord,
  CoachingNote,
} from '../core/schemas.js';

// ─── Program Repository ───────────────────────────────────────────────────────

export interface ProgramRepository {
  findById(id: string): Promise<ProgramRecord | null>;
  findActive(): Promise<ProgramRecord[]>;
  save(program: ProgramRecord): Promise<void>;
  update(id: string, patch: Partial<Pick<ProgramRecord, 'completedAt' | 'startedAt'>>): Promise<void>;
}

// ─── Program Position Repository ─────────────────────────────────────────────

export interface ProgramPositionRepository {
  findByProgramId(programId: string): Promise<ProgramPosition | null>;
  save(position: ProgramPosition): Promise<void>;
}

// ─── Session Repository ───────────────────────────────────────────────────────

export interface SessionRepository {
  findById(id: string): Promise<SessionRecord | null>;
  findByProgram(programId: string, limit?: number): Promise<SessionRecord[]>;
  /** TODO: Drizzle impl ignores domain param — needs a JOIN on programs.domain to filter correctly. */
  findRecentByDomain(domain: string, limit: number): Promise<SessionRecord[]>;
  save(record: SessionRecord): Promise<void>;
}

// ─── Coaching Note Repository ─────────────────────────────────────────────────

export interface CoachingNoteRepository {
  findBySessionId(sessionId: string): Promise<CoachingNote[]>;
  save(note: CoachingNote): Promise<void>;
}

// ─── Aggregate (convenience) ──────────────────────────────────────────────────

export interface Repositories {
  programs: ProgramRepository;
  positions: ProgramPositionRepository;
  sessions: SessionRepository;
  notes: CoachingNoteRepository;
}
