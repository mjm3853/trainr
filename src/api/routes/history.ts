/**
 * History API routes — past session queries.
 */

import { Hono } from 'hono';
import type { ApiEnv } from '../server.js';
import { getRecentSessions, getSessionById } from '../../services/history.service.js';
import { getActivePrograms } from '../../services/program.service.js';

export const historyRoutes = new Hono<ApiEnv>();

historyRoutes.get('/programs/:programId/history', async (c) => {
  const repos = c.get('repos');
  const programId = c.req.param('programId');
  const limit = parseInt(c.req.query('limit') ?? '20', 10);

  const summaries = await getRecentSessions(programId, limit, repos);

  return c.json({
    sessions: summaries.map((s) => ({
      id: s.record.id,
      templateId: s.record.templateId,
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

  return c.json({
    id: summary.record.id,
    programId: summary.record.programId,
    templateId: summary.record.templateId,
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
