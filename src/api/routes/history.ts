/**
 * History API routes — past session queries.
 */

import { Hono } from 'hono';
import type { ApiEnv } from '../server.js';
import type { ProgramConfig, SessionRecord } from '../../core/schemas.js';
import { getRecentSessions, getSessionById } from '../../services/history.service.js';
import { getProgramById, parseProgramConfig } from '../../services/program.service.js';
import type { Repositories } from '../../db/repository.js';

export const historyRoutes = new Hono<ApiEnv>();

/** Resolve a session templateId to its human-readable label from the program config. */
function resolveSessionLabel(config: ProgramConfig, record: SessionRecord): string | null {
  for (const cycle of config.cycles) {
    for (const session of cycle.sessions) {
      if (session.id === record.templateId) {
        return session.label;
      }
    }
  }
  return null;
}

/** Build a label lookup map for a program, caching config parsing. */
async function buildLabelMap(
  programId: string,
  records: SessionRecord[],
  repos: Repositories,
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const program = await getProgramById(programId, repos);
  if (!program) return labels;
  const config = parseProgramConfig(program);
  for (const record of records) {
    if (!labels.has(record.templateId)) {
      const label = resolveSessionLabel(config, record);
      if (label) labels.set(record.templateId, label);
    }
  }
  return labels;
}

historyRoutes.get('/programs/:programId/history', async (c) => {
  const repos = c.get('repos');
  const programId = c.req.param('programId');
  const limit = parseInt(c.req.query('limit') ?? '20', 10);

  const summaries = await getRecentSessions(programId, limit, repos);
  const labels = await buildLabelMap(
    programId,
    summaries.map((s) => s.record),
    repos,
  );

  return c.json({
    sessions: summaries.map((s) => ({
      id: s.record.id,
      templateId: s.record.templateId,
      label: labels.get(s.record.templateId) ?? null,
      cycleOrdinal: s.record.cycleOrdinal,
      sessionOrdinal: s.record.sessionOrdinal,
      completedAt: s.record.completedAt,
      durationMinutes: s.record.durationMinutes,
      skipped: s.record.skipped,
      skipReason: s.record.skipReason,
      activityCount: s.record.activities.length,
      activities: s.record.activities,
      context: s.record.context,
      userNotes: s.record.userNotes,
      notes: s.notes,
    })),
  });
});

historyRoutes.get('/sessions/:id', async (c) => {
  const repos = c.get('repos');
  const id = c.req.param('id');

  const summary = await getSessionById(id, repos);
  if (!summary) return c.json({ error: 'Session not found' }, 404);

  let label: string | null = null;
  const program = await getProgramById(summary.record.programId, repos);
  if (program) {
    const config = parseProgramConfig(program);
    label = resolveSessionLabel(config, summary.record);
  }

  return c.json({
    id: summary.record.id,
    programId: summary.record.programId,
    templateId: summary.record.templateId,
    label,
    cycleOrdinal: summary.record.cycleOrdinal,
    sessionOrdinal: summary.record.sessionOrdinal,
    completedAt: summary.record.completedAt,
    durationMinutes: summary.record.durationMinutes,
    skipped: summary.record.skipped,
    skipReason: summary.record.skipReason,
    context: summary.record.context,
    activities: summary.record.activities,
    userNotes: summary.record.userNotes,
    notes: summary.notes,
  });
});
