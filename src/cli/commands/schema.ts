/**
 * trainr schema <command> — runtime introspection.
 * Returns the Zod-derived JSON Schema for each command's input/output.
 * Agents use this to understand the CLI contract without reading docs.
 */

import { Command } from 'commander';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  SessionContextSchema,
  SessionRecordSchema,
  ActivityRecordSchema,
  ProgramConfigSchema,
  ProgramRecordSchema,
} from '../../core/schemas.js';
import { outputJson } from '../output.js';

const COMMAND_SCHEMAS: Record<string, { input: object; output: object; description: string }> = {
  'session.next': {
    description: 'Get today\'s planned session with resolved activity targets',
    input: {},
    output: zodToJsonSchema(SessionRecordSchema.partial(), 'SessionNext'),
  },
  'session.log': {
    description: 'Log a completed session',
    input: zodToJsonSchema(ActivityRecordSchema.array(), 'LogInput'),
    output: zodToJsonSchema(SessionRecordSchema, 'LogOutput'),
  },
  'session.skip': {
    description: 'Skip today\'s session with a reason',
    input: { type: 'object', properties: { reason: { type: 'string' } } },
    output: zodToJsonSchema(SessionRecordSchema, 'SkipOutput'),
  },
  'program.new': {
    description: 'Create a new program',
    input: zodToJsonSchema(ProgramConfigSchema, 'ProgramConfig'),
    output: zodToJsonSchema(ProgramRecordSchema, 'ProgramRecord'),
  },
  'program.status': {
    description: 'Get current program position',
    input: {},
    output: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        domain: { type: 'string' },
        position: { type: 'string' },
        cycleOrdinal: { type: 'number' },
        sessionOrdinal: { type: 'number' },
      },
    },
  },
  'context': {
    description: 'Pre-session context (disturbance input)',
    input: zodToJsonSchema(SessionContextSchema, 'SessionContext'),
    output: {},
  },
};

export function createSchemaCommand(): Command {
  const cmd = new Command('schema');
  cmd.description('Inspect input/output schemas for commands (for AI agents)');

  cmd
    .argument('[command]', 'Command path, e.g. session.next')
    .action((commandPath) => {
      if (!commandPath) {
        outputJson({
          available: Object.keys(COMMAND_SCHEMAS),
          usage: 'trainr schema <command>',
        });
        return;
      }

      const schema = COMMAND_SCHEMAS[commandPath];
      if (!schema) {
        console.error(`Unknown command schema: '${commandPath}'. Run \`trainr schema\` for list.`);
        process.exit(1);
      }

      outputJson(schema);
    });

  return cmd;
}
