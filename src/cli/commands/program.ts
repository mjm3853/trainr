import { Command } from 'commander';
import * as p from '@clack/prompts';
import type { Repositories } from '../../db/repository.js';
import { createProgram, getActivePrograms, parseProgramConfig, getProgramPosition } from '../../services/program.service.js';
import { getDomain, listDomains } from '../../core/domain.js';
import { parseOutputFormat, outputJson, outputNdjson } from '../output.js';
import { positionLabel } from '../../core/program.js';
import { create531Program } from '../../domains/workout/programs/531-4day.js';
import { createStewSmithPullupProgram } from '../../domains/workout/programs/stew-smith-pullups.js';
import { bold, dim, accent, divider, box } from '../render/theme.js';

export function createProgramCommand(repos: Repositories): Command {
  const program = new Command('program');
  program.description('Manage coaching programs');

  // ─── program new ─────────────────────────────────────────────────────────

  program
    .command('new')
    .description('Create a new program with an interactive wizard (not suitable for agents)')
    .action(async () => {
      p.intro('trainr — new program');

      try {
        const domains = listDomains();
        const domainChoice = await p.select({
          message: 'Which domain?',
          options: domains.map((d) => ({ value: d.id, label: d.displayName })),
        });
        if (p.isCancel(domainChoice)) { p.cancel('Cancelled.'); return; }

        let config;

        if (domainChoice === 'workout') {
          config = await workoutProgramWizard();
        } else {
          p.log.warn(`No wizard for '${domainChoice}' yet — using minimal defaults.`);
          return;
        }

        if (!config) { p.cancel('Cancelled.'); return; }

        const spinner = p.spinner();
        spinner.start('Saving program...');
        const created = await createProgram({ config }, repos);
        spinner.stop(`Program saved: ${created.id.slice(0, 8)}`);

        p.outro(`Run \`trainr session start\` to begin your first session.`);
      } catch (err) {
        p.cancel(err instanceof Error ? err.message : 'Unexpected error');
        process.exit(1);
      }
    });

  // ─── program list ─────────────────────────────────────────────────────────

  program
    .command('list')
    .description('List active programs (agent-friendly: use --output json)')
    .option('--output <format>', 'Output format: human|json|ndjson (JSON recommended for agents)', 'human')
    .option('--fields <fields>', 'Field mask for ndjson output (e.g. id,name,domain)')
    .action(async (options) => {
      const format = parseOutputFormat(options.output);

      try {
        const programs = await getActivePrograms(repos);

        if (format === 'json') {
          outputJson(programs.map((p) => ({ id: p.id, name: p.name, domain: p.domain, startedAt: p.startedAt })));
        } else if (format === 'ndjson') {
          outputNdjson(programs.map((p) => ({ id: p.id, name: p.name, domain: p.domain, startedAt: p.startedAt })));
        } else {
          if (programs.length === 0) {
            console.log('No active programs. Run `trainr program new` to create one.');
          } else {
            console.log(`\n  ${bold('Active Programs')}`);
            console.log(`  ${divider()}\n`);
            for (const prog of programs) {
              console.log(`  ${dim(prog.id.slice(0, 8))}  ${bold(prog.name)}  ${accent(prog.domain)}`);
            }
            console.log('');
          }
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // ─── program status ───────────────────────────────────────────────────────

  program
    .command('status')
    .description('Show current program position and next session (use --output json for AI agents)')
    .option('--program <id>', 'Program ID')
    .option('--output <format>', 'Output format: human|json (JSON recommended for agents)', 'human')
    .action(async (options) => {
      const format = parseOutputFormat(options.output);

      try {
        const programs = await getActivePrograms(repos);
        if (programs.length === 0) throw new Error('No active programs.');

        const prog = options.program
          ? programs.find((p) => p.id.startsWith(options.program))
          : programs[0];

        if (!prog) throw new Error(`Program '${options.program}' not found`);

        const config = parseProgramConfig(prog);
        const position = await getProgramPosition(prog.id, repos);

        if (!position) throw new Error('No position found for program');

        const label = positionLabel(config, position);

        if (format === 'json') {
          outputJson({
            id: prog.id,
            name: prog.name,
            domain: prog.domain,
            position: label,
            cycleOrdinal: position.currentCycleOrdinal,
            sessionOrdinal: position.currentSessionOrdinal,
          });
        } else {
          console.log('\n' + box(prog.name, [
            `${dim('Domain')}    ${accent(prog.domain)}`,
            `${dim('Position')}  ${label}`,
          ]));
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return program;
}

async function workoutProgramWizard() {
  const variant = await p.select({
    message: 'Which program?',
    options: [
      { value: '531', label: 'Wendler 5/3/1 (4-day split)' },
      { value: '531-bbb', label: 'Wendler 5/3/1 + BBB (4-day + supplemental volume)' },
      { value: 'stew-smith-pullups', label: 'Stew Smith Pull-up Program (3x/week)' },
    ],
  });
  if (p.isCancel(variant)) return null;

  if (variant === 'stew-smith-pullups') {
    return await stewSmithProgramWizard();
  }

  // Handle Wendler programs
  const unit = await p.select({
    message: 'Weight unit?',
    options: [
      { value: 'lbs', label: 'Pounds (lbs)' },
      { value: 'kg', label: 'Kilograms (kg)' },
    ],
  });
  if (p.isCancel(unit)) return null;

  p.log.info('Enter your Training Max (TM = ~90% of 1RM) for each lift.');

  const squat1rm = await p.text({ message: 'Squat 1RM?', validate: validateWeight });
  if (p.isCancel(squat1rm)) return null;

  const bench1rm = await p.text({ message: 'Bench 1RM?', validate: validateWeight });
  if (p.isCancel(bench1rm)) return null;

  const deadlift1rm = await p.text({ message: 'Deadlift 1RM?', validate: validateWeight });
  if (p.isCancel(deadlift1rm)) return null;

  const press1rm = await p.text({ message: 'Overhead Press 1RM?', validate: validateWeight });
  if (p.isCancel(press1rm)) return null;

  const toTM = (val: string) => Math.round(parseFloat(val) * 0.9 / 5) * 5;

  return create531Program({
    squatTM: toTM(squat1rm as string),
    benchTM: toTM(bench1rm as string),
    deadliftTM: toTM(deadlift1rm as string),
    pressTM: toTM(press1rm as string),
    includeBBB: variant === '531-bbb',
    unit: unit as 'lbs' | 'kg',
  });
}

async function stewSmithProgramWizard() {
  p.log.info('Stew Smith Pull-up Program — Building pull-up strength using military training methods.');

  const currentMax = await p.text({
    message: 'How many strict pull-ups can you do right now? (0 if none)',
    validate: (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 0) return 'Enter a non-negative number';
      return undefined;
    }
  });
  if (p.isCancel(currentMax)) return null;

  const sessionsPerWeek = await p.select({
    message: 'How many days per week do you want to train pull-ups?',
    options: [
      { value: 3, label: '3 days/week (recommended)' },
      { value: 4, label: '4 days/week (advanced)' },
    ],
  });
  if (p.isCancel(sessionsPerWeek)) return null;

  const includeAssistance = await p.confirm({
    message: 'Include assistance exercises? (recommended for beginners)',
  });
  if (p.isCancel(includeAssistance)) return null;

  return createStewSmithPullupProgram({
    currentMaxPullups: parseInt(currentMax as string, 10),
    sessionsPerWeek: sessionsPerWeek as 3 | 4,
    includeAssistance: includeAssistance as boolean,
  });
}

function validateWeight(v: string): string | undefined {
  const n = parseFloat(v);
  if (isNaN(n) || n <= 0) return 'Enter a positive number';
}
