/**
 * MCP tool definitions — mirrors CLI commands 1:1.
 * No interactive prompts. All inputs are structured JSON.
 */

import type { Repositories } from '../../db/repository.js';
import type { CoachFn } from '../../ai/coach.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SessionContextSchema, ActivityRecordSchema } from '../../core/schemas.js';
import { planSession, logSession, skipSession } from '../../services/session.service.js';
import { getActivePrograms, getProgramPosition, parseProgramConfig } from '../../services/program.service.js';
import { getRecentSessions } from '../../services/history.service.js';
import { positionLabel } from '../../core/program.js';
import { z } from 'zod';

interface ToolContext {
  repos: Repositories;
  coach: CoachFn;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  execute(args: unknown, ctx: ToolContext): Promise<unknown>;
}

const SessionContextInput = SessionContextSchema.partial().optional();
const LogSessionInput = z.object({
  programId: z.string().optional(),
  activities: z.array(ActivityRecordSchema),
  durationMinutes: z.number().int().positive().optional(),
  context: SessionContextSchema.optional(),
  userNotes: z.string().optional(),
});

export const TOOLS: McpTool[] = [
  {
    name: 'session_next',
    description: 'Get today\'s planned session with resolved activity targets',
    inputSchema: zodToJsonSchema(z.object({ programId: z.string().optional() }), 'session_next_input'),
    async execute(args, { repos }) {
      const { programId } = z.object({ programId: z.string().optional() }).parse(args);
      const programs = await repos.programs.findActive();
      const prog = programId ? programs.find((p) => p.id === programId) : programs[0];
      if (!prog) throw new Error('No active program found');

      const plan = await planSession(prog.id, repos);
      const config = parseProgramConfig(prog);
      const position = await getProgramPosition(prog.id, repos);

      return {
        programId: prog.id,
        programName: prog.name,
        position: positionLabel(config, position!),
        session: {
          id: plan.session.session.id,
          label: plan.session.session.label,
          estimatedMinutes: plan.session.session.estimatedDuration,
          notes: plan.session.session.notes,
          activities: plan.session.session.activities.map((a, i) => ({
            id: a.id,
            name: a.name,
            category: a.category,
            target: plan.resolvedTargets[i] ?? null,
          })),
        },
      };
    },
  },

  {
    name: 'session_log',
    description: 'Log a completed session with activity records',
    inputSchema: zodToJsonSchema(LogSessionInput, 'session_log_input'),
    async execute(args, { repos, coach }) {
      const input = LogSessionInput.parse(args);
      const programs = await repos.programs.findActive();
      const prog = input.programId ? programs.find((p) => p.id === input.programId) : programs[0];
      if (!prog) throw new Error('No active program found');

      const plan = await planSession(prog.id, repos, {
        context: input.context,
        coach,
      });

      const result = await logSession(
        {
          programId: prog.id,
          plannedSession: plan,
          activities: input.activities,
          durationMinutes: input.durationMinutes,
          context: input.context,
          userNotes: input.userNotes,
        },
        repos,
      );

      return {
        sessionId: result.record.id,
        programComplete: result.programComplete,
        skipped: false,
      };
    },
  },

  {
    name: 'session_skip',
    description: 'Skip today\'s session with an optional reason',
    inputSchema: zodToJsonSchema(
      z.object({ programId: z.string().optional(), reason: z.string().optional() }),
      'session_skip_input',
    ),
    async execute(args, { repos }) {
      const { programId, reason } = z.object({
        programId: z.string().optional(),
        reason: z.string().optional(),
      }).parse(args);

      const programs = await repos.programs.findActive();
      const prog = programId ? programs.find((p) => p.id === programId) : programs[0];
      if (!prog) throw new Error('No active program found');

      const record = await skipSession(prog.id, reason ?? 'No reason provided', repos);
      return { sessionId: record.id, skipped: true, reason: record.skipReason };
    },
  },

  {
    name: 'program_status',
    description: 'Get current program position and upcoming session info',
    inputSchema: zodToJsonSchema(z.object({ programId: z.string().optional() }), 'program_status_input'),
    async execute(args, { repos }) {
      const { programId } = z.object({ programId: z.string().optional() }).parse(args);
      const programs = await repos.programs.findActive();
      const prog = programId ? programs.find((p) => p.id === programId) : programs[0];
      if (!prog) throw new Error('No active program found');

      const config = parseProgramConfig(prog);
      const position = await getProgramPosition(prog.id, repos);

      return {
        id: prog.id,
        name: prog.name,
        domain: prog.domain,
        goalStatement: prog.goalStatement,
        position: positionLabel(config, position!),
        cycleOrdinal: position?.currentCycleOrdinal,
        sessionOrdinal: position?.currentSessionOrdinal,
      };
    },
  },

  {
    name: 'history_list',
    description: 'List recent sessions. Use fields param to limit output size.',
    inputSchema: zodToJsonSchema(
      z.object({
        programId: z.string().optional(),
        limit: z.number().int().positive().max(50).default(10),
        fields: z.string().optional(),
      }),
      'history_list_input',
    ),
    async execute(args, { repos }) {
      const { programId, limit, fields } = z.object({
        programId: z.string().optional(),
        limit: z.number().int().positive().max(50).default(10),
        fields: z.string().optional(),
      }).parse(args);

      const programs = await repos.programs.findActive();
      const prog = programId ? programs.find((p) => p.id === programId) : programs[0];
      if (!prog) throw new Error('No active program found');

      const summaries = await getRecentSessions(prog.id, limit, repos);
      const fieldList = fields?.split(',').map((f) => f.trim());

      return summaries.map((s) => {
        const full: Record<string, unknown> = {
          id: s.record.id,
          completedAt: s.record.completedAt,
          domain: prog.domain,
          skipped: s.record.skipped,
          skipReason: s.record.skipReason,
          durationMinutes: s.record.durationMinutes,
          activityCount: s.record.activities.length,
        };
        if (!fieldList) return full;
        return Object.fromEntries(fieldList.filter((k) => k in full).map((k) => [k, full[k]]));
      });
    },
  },

  {
    name: 'coach_ask',
    description: 'Ask the AI coach a freeform question with full program context',
    inputSchema: zodToJsonSchema(
      z.object({
        question: z.string().min(1),
        programId: z.string().optional(),
        context: SessionContextSchema.optional(),
      }),
      'coach_ask_input',
    ),
    async execute(args, { repos, coach }) {
      const { question, programId, context } = z.object({
        question: z.string().min(1),
        programId: z.string().optional(),
        context: SessionContextSchema.optional(),
      }).parse(args);

      const programs = await repos.programs.findActive();
      const prog = programId ? programs.find((p) => p.id === programId) : programs[0];
      if (!prog) throw new Error('No active program found');

      const plan = await planSession(prog.id, repos, {
        userMessage: question,
        context,
        coach,
      });

      return {
        question,
        response: plan.coachingNote?.content ?? 'No response — check ANTHROPIC_API_KEY',
        adjustments: plan.coachingNote?.adjustments ?? [],
        confidence: 'medium',
      };
    },
  },
];
