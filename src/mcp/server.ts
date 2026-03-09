#!/usr/bin/env node
/**
 * trainr MCP server.
 * Exposes all coaching functionality as MCP tools for AI agents.
 *
 * Transport selection:
 *   MCP_TRANSPORT=stdio  (default) — for local Claude Code integration
 *   MCP_TRANSPORT=http   — for hosted access with API key auth
 *
 * All tools accept JSON input, return JSON output.
 * Interactive prompts (@clack) are bypassed — context is passed as structured input.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerDomain } from '../core/domain.js';
import { registerRule } from '../core/progression.js';
import { initDb } from '../db/client.js';
import { createDrizzleRepositories } from '../db/repositories/drizzle/index.js';
import { workoutDomain } from '../domains/workout/index.js';
import { nullCoach } from '../ai/coach.js';
import { TOOLS } from './tools/index.js';

// ─── Boot ─────────────────────────────────────────────────────────────────────

registerDomain(workoutDomain);
for (const rule of workoutDomain.progressionRules) {
  registerRule(rule);
}

const db = initDb();
const repos = createDrizzleRepositories(db);

let coach = nullCoach;
if (process.env['ANTHROPIC_API_KEY']) {
  const { createClaudeCoach } = await import('../ai/claude.js');
  coach = createClaudeCoach();
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'trainr', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((t) => t.name === request.params.name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }

  // Validate API key if HTTP transport (middleware handles this for HTTP,
  // but we double-check here for defense-in-depth)
  const apiKey = process.env['TRAINR_API_KEY'];
  if (apiKey && process.env['MCP_TRANSPORT'] === 'http') {
    const provided = (request.params.arguments as Record<string, unknown>)?.['_apiKey'];
    if (provided !== apiKey) {
      return {
        content: [{ type: 'text', text: 'Unauthorized' }],
        isError: true,
      };
    }
  }

  try {
    const result = await tool.execute(request.params.arguments ?? {}, { repos, coach });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown error' }],
      isError: true,
    };
  }
});

// ─── Transport ────────────────────────────────────────────────────────────────

const transport = process.env['MCP_TRANSPORT'] ?? 'stdio';

if (transport === 'stdio') {
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  // Server runs until process exits
} else {
  console.error(`MCP_TRANSPORT '${transport}' not yet implemented. Use 'stdio'.`);
  process.exit(1);
}
