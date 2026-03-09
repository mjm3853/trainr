# trainr

Personal coaching CLI with progressive programs for workouts, golf, learning, and more.

Built on **7 universal primitives** that model any progressive training domain. Ships with a **workout domain** (Wendler 5/3/1, linear progression); new domains plug in via a single interface. AI coaching through Claude is additive -- the system is fully functional without it.

## Quick Start

```bash
npm install
export DATABASE_URL="file:./trainr.db"
npx trainr program new        # interactive program creation
npx trainr session next        # preview today's plan
npx trainr session start       # begin session with context collection + logging
```

Optionally set `ANTHROPIC_API_KEY` to enable AI-powered coaching adjustments.

## CLI Reference

| Command | Description |
|---|---|
| `trainr program new` | Create a new program (interactive) |
| `trainr program list` | List all programs |
| `trainr program status` | Show active program position and next session |
| `trainr session next` | Preview today's planned session with resolved targets |
| `trainr session start` | Collect context, run session, log results |
| `trainr session skip [reason]` | Skip today's session |
| `trainr history [--limit N]` | Show recent session history |
| `trainr coach ask "<question>"` | Ask the AI coach a freeform question |
| `trainr schema [command]` | Print runtime JSON schemas for any command's input/output |

**Global flags** -- all commands support `--output human|json|ndjson` and `--dry-run` for mutations. Use `--program <id>` to target a specific program when multiple are active.

## For AI Agents

trainr is designed for agent consumption. Every command emits structured data; the MCP server provides direct tool access.

### MCP Server

```bash
MCP_TRANSPORT=stdio npm run mcp:stdio
```

Six tools mirror the CLI 1:1, accepting and returning JSON:

| Tool | Purpose |
|---|---|
| `session_next` | Get today's planned session with resolved activity targets |
| `session_log` | Log a completed session with activity records |
| `session_skip` | Skip today's session with an optional reason |
| `program_status` | Get current program position and upcoming session info |
| `history_list` | List recent sessions (supports `fields` param to limit output size) |
| `coach_ask` | Ask the AI coach a freeform question with full program context |

### Structured CLI

`--output json` on any command produces machine-readable output. `trainr schema [command]` emits the Zod-derived JSON Schema for that command's input, so agents can validate payloads at runtime without hardcoding types.

## Architecture

Seven **universal primitives** model any progressive coaching domain:

**Program** -- a named training plan with cycles, goal statement, and domain-specific settings. **Cycle** -- a repeating temporal unit (e.g., a 4-week Wendler cycle) containing ordered sessions. **Session** -- one day's engagement, composed of activities with resolved targets. **Activity** -- a single exercise or task with a metric type (load/reps, duration, rating, completion, etc.) and a progression rule. **ProgressionRule** -- a pure function that computes the next target from history (e.g., Wendler percentages, linear +5 lbs). **SessionContext** -- pre-session state (energy level, pain points, time constraints) that feeds AI adjustments. **CoachingNote** -- AI-generated or user-authored narrative with structured adjustments attached to a session.

**Key design decisions.** All types derive from **Zod schemas** in `src/core/schemas.ts` -- TypeScript types are inferred, never hand-written. Services depend on **Repository interfaces**, not Drizzle directly, enabling in-memory test doubles (51 tests, zero external calls). The **CoachFn** is injected: tests use a null coach, production optionally wires in Claude. Domain modules register via `registerDomain()` + `registerRule()` at boot with zero changes to core code.

## Configuration

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Storage backend | `file:./trainr.db` (local SQLite), `libsql://...turso.io` (Turso), `:memory:` (tests) |
| `ANTHROPIC_API_KEY` | AI coaching via Claude | Optional -- system works without it |
| `TRAINR_API_KEY` | MCP HTTP transport auth | Only needed for `MCP_TRANSPORT=http` |

## Adding a Domain

Implement the **DomainModule** interface (`src/core/domain.ts`):

```typescript
export interface DomainModule {
  id: string;                           // e.g. 'golf'
  displayName: string;
  progressionRules: ProgressionRule[];   // domain-specific progression logic
  contextQuestions: ContextQuestion[];   // pre-session prompts
  systemPrompt: string;                 // AI coach persona + guidelines
  validateProgramSettings(settings: unknown): Result<void>;
  formatActivityTarget(template, target): string;
  formatActivityRecord(template, record): string;
  summarizeSession(activities): string;
  contextForAI(settings, context): Record<string, unknown>;
}
```

Register at boot in `src/cli/index.ts` and `src/mcp/server.ts`:

```typescript
registerDomain(golfDomain);
for (const rule of golfDomain.progressionRules) {
  registerRule(rule);
}
```

See `src/domains/workout/` for the reference implementation -- includes Wendler 5/3/1, Boring But Big, and linear progression rules.

## Development

```bash
npm test              # vitest, 51 tests
npm run test:watch    # watch mode
npm run lint          # tsc --noEmit
npm run dev -- <args> # run CLI via tsx without building
npm run build         # tsc to dist/
```

Requires Node >= 20.
