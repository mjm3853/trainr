/**
 * Session API routes — plan, log, skip.
 * Mirrors MCP session tools but returns richer data for the web UI.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiEnv } from '../server.js';
import { ActivityRecordSchema, SessionContextSchema } from '../../core/schemas.js';
import { positionLabel } from '../../core/program.js';
import { planSession, logSession, skipSession } from '../../services/session.service.js';
import { getActivePrograms, getProgramPosition, parseProgramConfig } from '../../services/program.service.js';

export const sessionRoutes = new Hono<ApiEnv>();

/** Resolve the target program from an optional programId query param. */
async function resolveProgram(repos: Parameters<typeof getActivePrograms>[0], programId?: string) {
  const programs = await getActivePrograms(repos);
  const prog = programId ? programs.find((p) => p.id === programId) : programs[0];
  return prog ?? null;
}

/** Format a planned session for the API response (includes metric for frontend input rendering). */
function formatPlanResponse(
  prog: Awaited<ReturnType<typeof getActivePrograms>>[0],
  config: ReturnType<typeof parseProgramConfig>,
  position: NonNullable<Awaited<ReturnType<typeof getProgramPosition>>>,
  plan: Awaited<ReturnType<typeof planSession>>,
) {
  return {
    programId: prog.id,
    programName: prog.name,
    position: positionLabel(config, position),
    session: {
      id: plan.session.session.id,
      label: plan.session.session.label,
      estimatedMinutes: plan.session.session.estimatedDuration,
      notes: plan.session.session.notes,
      activities: plan.session.session.activities.map((a, i) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        metric: a.metric,
        config: a.config,
        target: plan.resolvedTargets[i] ?? null,
      })),
    },
    coachingNote: plan.coachingNote,
  };
}

// ─── GET /sessions/next ──────────────────────────────────────────────────────

sessionRoutes.get('/sessions/next', async (c) => {
  const repos = c.get('repos');
  const programId = c.req.query('programId');

  const prog = await resolveProgram(repos, programId);
  if (!prog) return c.json({ error: 'No active program found' }, 404);

  const plan = await planSession(prog.id, repos);
  const config = parseProgramConfig(prog);
  const position = await getProgramPosition(prog.id, repos);
  if (!position) return c.json({ error: 'No position found' }, 404);

  return c.json(formatPlanResponse(prog, config, position, plan));
});

// ─── POST /sessions/next/coached ─────────────────────────────────────────────

const CoachedInput = z.object({
  programId: z.string().optional(),
  context: SessionContextSchema,
  userMessage: z.string().optional(),
});

sessionRoutes.post('/sessions/next/coached', async (c) => {
  const repos = c.get('repos');
  const coach = c.get('coach');
  const body = CoachedInput.parse(await c.req.json());

  const prog = await resolveProgram(repos, body.programId);
  if (!prog) return c.json({ error: 'No active program found' }, 404);

  const plan = await planSession(prog.id, repos, {
    context: body.context,
    ...(body.userMessage ? { userMessage: body.userMessage } : {}),
    coach,
  });

  const config = parseProgramConfig(prog);
  const position = await getProgramPosition(prog.id, repos);
  if (!position) return c.json({ error: 'No position found' }, 404);

  return c.json(formatPlanResponse(prog, config, position, plan));
});

// ─── POST /sessions/log ──────────────────────────────────────────────────────

const LogInput = z.object({
  programId: z.string().optional(),
  activities: z.array(ActivityRecordSchema),
  durationMinutes: z.number().int().positive().optional(),
  context: SessionContextSchema.optional(),
  userNotes: z.string().optional(),
});

sessionRoutes.post('/sessions/log', async (c) => {
  const repos = c.get('repos');
  const coach = c.get('coach');
  const body = LogInput.parse(await c.req.json());

  const prog = await resolveProgram(repos, body.programId);
  if (!prog) return c.json({ error: 'No active program found' }, 404);

  // Reconstruct PlannedSession (same pattern as MCP session_log tool)
  const plan = await planSession(prog.id, repos, {
    ...(body.context ? { context: body.context } : {}),
    coach,
  });

  const result = await logSession(
    {
      programId: prog.id,
      plannedSession: plan,
      activities: body.activities,
      ...(body.durationMinutes ? { durationMinutes: body.durationMinutes } : {}),
      ...(body.context ? { context: body.context } : {}),
      ...(body.userNotes ? { userNotes: body.userNotes } : {}),
    },
    repos,
  );

  return c.json({
    sessionId: result.record.id,
    programComplete: result.programComplete,
  });
});

// ─── POST /sessions/skip ─────────────────────────────────────────────────────

const SkipInput = z.object({
  programId: z.string().optional(),
  reason: z.string().optional(),
});

sessionRoutes.post('/sessions/skip', async (c) => {
  const repos = c.get('repos');
  const body = SkipInput.parse(await c.req.json());

  const prog = await resolveProgram(repos, body.programId);
  if (!prog) return c.json({ error: 'No active program found' }, 404);

  const record = await skipSession(prog.id, body.reason ?? 'No reason provided', repos);

  return c.json({ sessionId: record.id, skipped: true });
});
