import { Command } from 'commander';
import * as p from '@clack/prompts';
import type { Repositories } from '../../db/repository.js';
import type { CoachFn } from '../../ai/coach.js';
import { planSession, logSession, skipSession } from '../../services/session.service.js';
import { getActivePrograms, parseProgramConfig } from '../../services/program.service.js';
import { getDomain } from '../../core/domain.js';
import { collectSessionContext } from '../prompts/context.prompts.js';
import { logActivity } from '../prompts/activity.prompts.js';
import { renderPlannedSession } from '../render/session.render.js';
import { parseOutputFormat, outputJson } from '../output.js';
import { positionLabel } from '../../core/program.js';
import { getProgramPosition } from '../../services/program.service.js';

export function createSessionCommand(repos: Repositories, coach: CoachFn): Command {
  const session = new Command('session');
  session.description('Manage training sessions');

  // ─── session next ────────────────────────────────────────────────────────

  session
    .command('next')
    .description('Preview today\'s planned session')
    .option('--program <id>', 'Program ID (defaults to most recent active)')
    .option('--output <format>', 'Output format: human|json', 'human')
    .action(async (options) => {
      const format = parseOutputFormat(options.output);

      try {
        const programId = await resolveProgramId(options.program, repos);
        const plan = await planSession(programId, repos);
        const config = parseProgramConfig((await repos.programs.findById(programId))!);
        const position = await getProgramPosition(programId, repos);
        const domain = getDomain(config.domain);

        if (format === 'json') {
          outputJson({
            programName: config.name,
            position: positionLabel(config, position!),
            session: {
              label: plan.session.session.label,
              estimatedMinutes: plan.session.session.estimatedDuration,
              activities: plan.session.session.activities.map((a, i) => ({
                id: a.id,
                name: a.name,
                target: plan.resolvedTargets[i] ?? null,
              })),
            },
          });
        } else {
          console.log(renderPlannedSession(plan, domain));
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // ─── session start ───────────────────────────────────────────────────────

  session
    .command('start')
    .description('Start a session: context check-in → AI coach → log activities → save')
    .option('--program <id>', 'Program ID')
    .action(async (options) => {
      p.intro('trainr — session');

      try {
        const programId = await resolveProgramId(options.program, repos);
        const program = (await repos.programs.findById(programId))!;
        const config = parseProgramConfig(program);
        const position = await getProgramPosition(programId, repos);
        const domain = getDomain(config.domain);

        p.log.info(`${config.name} — ${positionLabel(config, position!)}`);

        // Context collection
        const context = await collectSessionContext();

        // Plan session (with AI if context provided)
        const spinner = p.spinner();
        if (context) {
          spinner.start('Checking in with your coach...');
        }
        const plan = await planSession(programId, repos, { context: context ?? undefined, coach });
        if (context) spinner.stop('Coach ready');

        // Display plan
        console.log(renderPlannedSession(plan, domain));

        const proceed = await p.confirm({ message: 'Ready to start?' });
        if (p.isCancel(proceed) || !proceed) {
          p.cancel('Session cancelled.');
          return;
        }

        // Log each activity
        const activityRecords = [];
        for (let i = 0; i < plan.session.session.activities.length; i++) {
          const template = plan.session.session.activities[i]!;
          const target = plan.resolvedTargets[i]!;
          const record = await logActivity(template, target, domain);
          if (!record) {
            p.cancel('Session cancelled.');
            return;
          }
          activityRecords.push(record);
        }

        const userNotes = await p.text({
          message: 'Session notes? (optional)',
          placeholder: 'Felt strong on squats today',
        });
        if (p.isCancel(userNotes)) {
          p.cancel('Session cancelled.');
          return;
        }

        const start = Date.now();
        const result = await logSession(
          {
            programId,
            plannedSession: plan,
            activities: activityRecords,
            context: context ?? undefined,
            userNotes: (userNotes as string) || '',
          },
          repos,
        );

        p.outro(
          result.programComplete
            ? '🏆 Program complete! Start a new program with `trainr program new`'
            : `Session saved. Next: ${getNextSessionLabel(config, result)}`,
        );
      } catch (err) {
        p.cancel(err instanceof Error ? err.message : 'Unexpected error');
        process.exit(1);
      }
    });

  // ─── session skip ────────────────────────────────────────────────────────

  session
    .command('skip [reason]')
    .description('Skip today\'s session')
    .option('--program <id>', 'Program ID')
    .option('--dry-run', 'Validate without saving')
    .option('--output <format>', 'Output format: human|json', 'human')
    .action(async (reason, options) => {
      const format = parseOutputFormat(options.output);

      try {
        const programId = await resolveProgramId(options.program, repos);
        const skipReason = reason || 'No reason provided';

        if (options.dryRun) {
          if (format === 'json') {
            outputJson({ valid: true, wouldWrite: { skipped: true, skipReason }, warnings: [], errors: [] });
          } else {
            console.log(`[dry-run] Would skip session with reason: "${skipReason}"`);
          }
          return;
        }

        const record = await skipSession(programId, skipReason, repos);

        if (format === 'json') {
          outputJson({ id: record.id, skipped: true, skipReason: record.skipReason });
        } else {
          console.log(`Session skipped. Reason: ${skipReason}`);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return session;
}

async function resolveProgramId(programId: string | undefined, repos: Repositories): Promise<string> {
  if (programId) return programId;

  const programs = await repos.programs.findActive();
  if (programs.length === 0) {
    throw new Error('No active programs found. Run `trainr program new` to create one.');
  }
  if (programs.length === 1) return programs[0]!.id;

  // Multiple active programs — pick most recently started
  return programs
    .filter((p) => p.startedAt !== null)
    .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))[0]?.id ?? programs[0]!.id;
}

function getNextSessionLabel(_config: ReturnType<typeof parseProgramConfig>, _result: unknown): string {
  return 'check `trainr session next`';
}
