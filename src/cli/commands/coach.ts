import { Command } from 'commander';
import type { Repositories } from '../../db/repository.js';
import type { CoachFn } from '../../ai/coach.js';
import { planSession } from '../../services/session.service.js';
import { getActivePrograms, parseProgramConfig, getProgramPosition } from '../../services/program.service.js';
import { getDomain } from '../../core/domain.js';
import { parseOutputFormat, outputJson } from '../output.js';
import { bold, dim, accent, S, box } from '../render/theme.js';

export function createCoachCommand(repos: Repositories, coach: CoachFn): Command {
  const coachCmd = new Command('coach');
  coachCmd.description('Ask your AI coach a question');

  coachCmd
    .argument('<question>', 'Question for your coach')
    .option('--program <id>', 'Program context')
    .option('--output <format>', 'Output format: human|json', 'human')
    .action(async (question, options) => {
      const format = parseOutputFormat(options.output);

      try {
        const programs = await getActivePrograms(repos);
        if (programs.length === 0) throw new Error('No active programs.');

        const prog = options.program
          ? programs.find((p) => p.id.startsWith(options.program))
          : programs[0];

        if (!prog) throw new Error(`Program '${options.program}' not found`);

        const plan = await planSession(prog.id, repos, {
          userMessage: question,
          coach,
        });

        const response = plan.coachingNote?.content ?? 'No response — check your ANTHROPIC_API_KEY';

        if (format === 'json') {
          outputJson({
            question,
            response,
            adjustments: plan.coachingNote?.adjustments ?? [],
          });
        } else {
          const lines: (string | null)[] = [response];
          if (plan.coachingNote?.adjustments.length) {
            lines.push(null);
            lines.push(bold('Adjustments'));
            for (const adj of plan.coachingNote.adjustments) {
              lines.push(`  ${accent(S.ARROW)} ${bold(adj.activityId)} ${dim('—')} ${adj.rationale}`);
            }
          }
          console.log('\n' + box('Coach', lines));
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return coachCmd;
}
