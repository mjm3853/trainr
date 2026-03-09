import { Command } from 'commander';
import type { Repositories } from '../../db/repository.js';
import { getRecentSessions, getSessionById } from '../../services/history.service.js';
import { getActivePrograms, parseProgramConfig } from '../../services/program.service.js';
import { getDomain } from '../../core/domain.js';
import { parseOutputFormat, outputJson, outputNdjson, applyFieldMask } from '../output.js';
import { renderSessionRecord } from '../render/session.render.js';

export function createHistoryCommand(repos: Repositories): Command {
  const history = new Command('history');
  history.description('View session history');

  history
    .argument('[limit]', 'Number of recent sessions to show', '10')
    .option('--program <id>', 'Filter by program ID')
    .option('--session <id>', 'Show full detail for a specific session')
    .option('--output <format>', 'Output format: human|json|ndjson (JSON recommended for agents)', 'human')
    .option('--fields <fields>', 'Field mask for ndjson: id,completedAt,domain,summary')
    .action(async (limit, options) => {
      const format = parseOutputFormat(options.output);

      try {
        // Single session detail
        if (options.session) {
          const summary = await getSessionById(options.session, repos);
          if (!summary) throw new Error(`Session '${options.session}' not found`);

          if (format === 'json') {
            outputJson(summary);
          } else {
            const programs = await getActivePrograms(repos);
            const prog = programs.find((p) => p.id === summary.record.programId);
            const domain = prog ? getDomain(parseProgramConfig(prog).domain) : null;
            if (domain && prog) {
              console.log(renderSessionRecord(summary.record, summary.notes, domain));
            } else {
              console.log(JSON.stringify(summary, null, 2));
            }
          }
          return;
        }

        // List sessions
        const programs = await getActivePrograms(repos);
        const programId = options.program ?? programs[0]?.id;
        if (!programId) throw new Error('No active programs.');

        const summaries = await getRecentSessions(programId, parseInt(limit, 10), repos);

        if (format === 'json') {
          outputJson(summaries.map((s) => ({
            id: s.record.id,
            completedAt: s.record.completedAt,
            skipped: s.record.skipped,
            activities: s.record.activities.length,
          })));
        } else if (format === 'ndjson') {
          const prog = programs.find((p) => p.id === programId);
          const domain = prog ? getDomain(parseProgramConfig(prog).domain) : null;

          outputNdjson(summaries.map((s) => {
            const obj: Record<string, unknown> = {
              id: s.record.id,
              completedAt: s.record.completedAt,
              domain: parseProgramConfig(prog!).domain,
              skipped: s.record.skipped,
              summary: '—',
            };
            return applyFieldMask(obj, options.fields);
          }));
        } else {
          if (summaries.length === 0) {
            console.log('No sessions logged yet.');
          } else {
            const prog = programs.find((p) => p.id === programId);
            const domain = prog ? getDomain(parseProgramConfig(prog).domain) : null;
            for (const s of summaries) {
              const date = s.record.completedAt?.toLocaleDateString() ?? 'Skipped';
              const status = s.record.skipped ? '[SKIP]' : '[DONE]';
              console.log(`  ${status}  ${date}  ${s.record.id.slice(0, 8)}`);
            }
          }
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return history;
}
