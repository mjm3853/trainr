/**
 * Program API routes.
 */

import { Hono } from 'hono';
import type { ApiEnv } from '../server.js';
import { getActivePrograms, getProgramById, getProgramPosition, parseProgramConfig } from '../../services/program.service.js';
import { positionLabel } from '../../core/program.js';

export const programRoutes = new Hono<ApiEnv>();

programRoutes.get('/programs', async (c) => {
  const repos = c.get('repos');
  const programs = await getActivePrograms(repos);

  return c.json({
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      goalStatement: p.goalStatement,
      startedAt: p.startedAt,
    })),
  });
});

programRoutes.get('/programs/:id/status', async (c) => {
  const repos = c.get('repos');
  const id = c.req.param('id');

  const program = await getProgramById(id, repos);
  if (!program) return c.json({ error: 'Program not found' }, 404);

  const position = await getProgramPosition(id, repos);
  if (!position) return c.json({ error: 'No position found' }, 404);

  const config = parseProgramConfig(program);

  return c.json({
    id: program.id,
    name: program.name,
    domain: program.domain,
    goalStatement: program.goalStatement,
    position: positionLabel(config, position),
    cycleOrdinal: position.currentCycleOrdinal,
    sessionOrdinal: position.currentSessionOrdinal,
  });
});
