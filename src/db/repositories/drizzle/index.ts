/**
 * Drizzle repository implementations — production storage backed by libSQL/Turso or Postgres.
 * Domain types are serialized/deserialized via JSON with Zod validation on read.
 */

import { eq, desc, isNull } from 'drizzle-orm';
import type { Db } from '../../client.js';
import {
  programs,
  programPosition,
  sessionRecords,
  coachingNotes,
} from '../../schema.js';
import type {
  ProgramRecord,
  ProgramPosition,
  SessionRecord,
  CoachingNote,
} from '../../../core/schemas.js';
import {
  ProgramConfigSchema,
  ProgramPositionSchema,
  SessionRecordSchema,
  CoachingNoteSchema,
} from '../../../core/schemas.js';
import type {
  ProgramRepository,
  ProgramPositionRepository,
  SessionRepository,
  CoachingNoteRepository,
  Repositories,
} from '../../repository.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSettings(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    console.warn(`[trainr] Failed to parse program settings JSON: ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

// ─── Program Repository ───────────────────────────────────────────────────────

export class DrizzleProgramRepository implements ProgramRepository {
  constructor(private db: Db) {}

  async findById(id: string): Promise<ProgramRecord | null> {
    const rows = await this.db.select().from(programs).where(eq(programs.id, id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.rowToRecord(row);
  }

  async findActive(): Promise<ProgramRecord[]> {
    const rows = await this.db
      .select()
      .from(programs)
      .where(isNull(programs.completedAt));
    return rows.map((row) => this.rowToRecord(row));
  }

  async save(program: ProgramRecord): Promise<void> {
    await this.db
      .insert(programs)
      .values({
        id: program.id,
        name: program.name,
        domain: program.domain,
        goalStatement: program.goalStatement,
        configJson: program.configJson,
        settingsJson: JSON.stringify(program.settings),
        startedAt: program.startedAt,
        completedAt: program.completedAt,
        createdAt: program.createdAt,
      })
      .onConflictDoUpdate({
        target: programs.id,
        set: {
          name: program.name,
          domain: program.domain,
          goalStatement: program.goalStatement,
          configJson: program.configJson,
          settingsJson: JSON.stringify(program.settings),
          startedAt: program.startedAt,
          completedAt: program.completedAt,
        },
      });
  }

  async update(
    id: string,
    patch: Partial<Pick<ProgramRecord, 'completedAt' | 'startedAt'>>,
  ): Promise<void> {
    await this.db.update(programs).set(patch).where(eq(programs.id, id));
  }

  private rowToRecord(row: typeof programs.$inferSelect): ProgramRecord {
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      goalStatement: row.goalStatement,
      configJson: row.configJson,
      settings: parseSettings(row.settingsJson),
      startedAt: row.startedAt ?? null,
      completedAt: row.completedAt ?? null,
      createdAt: row.createdAt ?? new Date(),
    };
  }
}

// ─── Program Position Repository ─────────────────────────────────────────────

export class DrizzleProgramPositionRepository implements ProgramPositionRepository {
  constructor(private db: Db) {}

  async findByProgramId(programId: string): Promise<ProgramPosition | null> {
    const rows = await this.db
      .select()
      .from(programPosition)
      .where(eq(programPosition.programId, programId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    return ProgramPositionSchema.parse({
      programId: row.programId,
      currentCycleOrdinal: row.currentCycleOrdinal,
      currentSessionOrdinal: row.currentSessionOrdinal,
      updatedAt: row.updatedAt,
    });
  }

  async save(position: ProgramPosition): Promise<void> {
    await this.db
      .insert(programPosition)
      .values({
        programId: position.programId,
        currentCycleOrdinal: position.currentCycleOrdinal,
        currentSessionOrdinal: position.currentSessionOrdinal,
        updatedAt: position.updatedAt,
      })
      .onConflictDoUpdate({
        target: programPosition.programId,
        set: {
          currentCycleOrdinal: position.currentCycleOrdinal,
          currentSessionOrdinal: position.currentSessionOrdinal,
          updatedAt: position.updatedAt,
        },
      });
  }
}

// ─── Session Repository ───────────────────────────────────────────────────────

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private db: Db) {}

  async findById(id: string): Promise<SessionRecord | null> {
    const rows = await this.db
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.rowToRecord(row);
  }

  async findByProgram(programId: string, limit?: number): Promise<SessionRecord[]> {
    const query = this.db
      .select()
      .from(sessionRecords)
      .where(eq(sessionRecords.programId, programId))
      .orderBy(desc(sessionRecords.createdAt));

    const rows = limit ? await query.limit(limit) : await query;
    return rows.map((row) => this.rowToRecord(row));
  }

  async findRecentByDomain(_domain: string, limit: number): Promise<SessionRecord[]> {
    // Domain filtering requires joining programs — simplified: return most recent
    const rows = await this.db
      .select()
      .from(sessionRecords)
      .orderBy(desc(sessionRecords.createdAt))
      .limit(limit);
    return rows.map((row) => this.rowToRecord(row));
  }

  async save(record: SessionRecord): Promise<void> {
    await this.db
      .insert(sessionRecords)
      .values({
        id: record.id,
        programId: record.programId,
        templateId: record.templateId,
        cycleOrdinal: record.cycleOrdinal,
        sessionOrdinal: record.sessionOrdinal,
        completedAt: record.completedAt,
        durationMinutes: record.durationMinutes,
        contextJson: record.context ? JSON.stringify(record.context) : null,
        activitiesJson: JSON.stringify(record.activities),
        userNotes: record.userNotes,
        skipped: record.skipped,
        skipReason: record.skipReason,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sessionRecords.id,
        set: {
          completedAt: record.completedAt,
          durationMinutes: record.durationMinutes,
          contextJson: record.context ? JSON.stringify(record.context) : null,
          activitiesJson: JSON.stringify(record.activities),
          userNotes: record.userNotes,
          skipped: record.skipped,
          skipReason: record.skipReason,
        },
      });
  }

  private rowToRecord(row: typeof sessionRecords.$inferSelect): SessionRecord {
    const activities = JSON.parse(row.activitiesJson) as unknown;
    const context = row.contextJson ? JSON.parse(row.contextJson) as unknown : null;

    return SessionRecordSchema.parse({
      id: row.id,
      programId: row.programId,
      templateId: row.templateId,
      cycleOrdinal: row.cycleOrdinal,
      sessionOrdinal: row.sessionOrdinal,
      completedAt: row.completedAt ?? null,
      durationMinutes: row.durationMinutes ?? null,
      context,
      activities,
      userNotes: row.userNotes,
      skipped: row.skipped,
      skipReason: row.skipReason ?? null,
    });
  }
}

// ─── Coaching Note Repository ─────────────────────────────────────────────────

export class DrizzleCoachingNoteRepository implements CoachingNoteRepository {
  constructor(private db: Db) {}

  async findBySessionId(sessionId: string): Promise<CoachingNote[]> {
    const rows = await this.db
      .select()
      .from(coachingNotes)
      .where(eq(coachingNotes.sessionId, sessionId))
      .orderBy(coachingNotes.generatedAt);
    return rows.map((row) => this.rowToRecord(row));
  }

  async save(note: CoachingNote): Promise<void> {
    await this.db
      .insert(coachingNotes)
      .values({
        id: note.id,
        sessionId: note.sessionId,
        phase: note.phase,
        content: note.content,
        adjustmentsJson: JSON.stringify(note.adjustments),
        source: note.source,
        generatedAt: note.generatedAt,
      })
      .onConflictDoUpdate({
        target: coachingNotes.id,
        set: {
          content: note.content,
          adjustmentsJson: JSON.stringify(note.adjustments),
        },
      });
  }

  private rowToRecord(row: typeof coachingNotes.$inferSelect): CoachingNote {
    const adjustments = JSON.parse(row.adjustmentsJson) as unknown;
    return CoachingNoteSchema.parse({
      id: row.id,
      sessionId: row.sessionId,
      phase: row.phase,
      content: row.content,
      adjustments,
      generatedAt: row.generatedAt,
      source: row.source,
    });
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createDrizzleRepositories(db: Db): Repositories {
  return {
    programs: new DrizzleProgramRepository(db),
    positions: new DrizzleProgramPositionRepository(db),
    sessions: new DrizzleSessionRepository(db),
    notes: new DrizzleCoachingNoteRepository(db),
  };
}
