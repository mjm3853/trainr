# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**trainr** is a personal coaching CLI that models progressive training across arbitrary domains (workouts, golf, learning, etc.) using 7 universal primitives: **Program**, **Cycle**, **Session**, **Activity**, **ProgressionRule**, **SessionContext**, and **CoachingNote**. Currently ships with a **workout domain** (Wendler 5/3/1, Boring But Big, linear progression). AI coaching via Claude is optional and additive.

## Commands

```bash
npm run dev -- <args>        # Run CLI via tsx (no build step)
npm run build                # tsc → dist/
npm run lint                 # tsc --noEmit
npm test                     # vitest run (all tests)
npm run test:watch           # vitest in watch mode
npx vitest run tests/core/schemas.test.ts  # single test file
npm run db:generate          # drizzle-kit generate migrations
npm run db:push              # drizzle-kit push schema
npm run db:studio            # drizzle-kit studio (DB browser)
npm run api                  # Hono REST API server
npm run mcp:stdio            # MCP server (stdio transport)
npm run mcp:http             # MCP server (HTTP transport)
```

The **web/** directory is a separate Next.js 16 app (React 19, shadcn, TanStack Query). Run `npm run dev` from within `web/`.

## Architecture

### Layered Structure

The codebase follows a strict dependency direction: **CLI/MCP/API → Services → Core + Repository interfaces ← DB implementations**.

- **`src/core/`** — Domain primitives and the type system. `schemas.ts` is the **single source of truth** for all types: Zod schemas define the shapes, TypeScript types are inferred via `z.infer<>` (never hand-written). `domain.ts` defines the **DomainModule** extension interface. `progression.ts` defines **ProgressionRule** (pure functions computing next targets from history). `registry.ts` is a generic factory used by both domain and progression registries.

- **`src/services/`** — Business logic layer. `session.service.ts`, `program.service.ts`, and `history.service.ts` operate on **Repository interfaces** (not Drizzle), accepting repos and a **CoachFn** via dependency injection.

- **`src/db/`** — Storage layer. `repository.ts` defines the repository interfaces. `schema.ts` is the Drizzle ORM schema. Two implementations live under `repositories/`: **drizzle/** (SQLite/libSQL/Postgres) and **memory/** (in-memory doubles for tests).

- **`src/domains/workout/`** — Reference domain implementation. `index.ts` exports the DomainModule. `rules/` contains progression rule implementations. `programs/` contains program templates. `schemas.ts` has workout-specific Zod schemas.

- **`src/cli/`** — Commander-based CLI. `commands/` has one file per command group. `render/` handles terminal UI with picocolors. `output.ts` handles `--output human|json|ndjson` formatting.

- **`src/mcp/`** — Model Context Protocol server with `tools/` mirroring CLI commands 1:1. Supports stdio and HTTP transports.

- **`src/api/`** — Hono REST API server (`routes/` + `server.ts`).

- **`src/ai/`** — AI coaching layer. `coach.ts` exports `nullCoach` (no-op) and the `CoachFn` type. `claude.ts` implements coaching via the Anthropic SDK. `schemas.ts` defines AI input/output schemas.

### Key Design Patterns

**Zod-first types** — Add or change a type in `src/core/schemas.ts` as a Zod schema; the TypeScript type follows automatically. The `trainr schema` CLI command exposes these as JSON Schema at runtime.

**Repository interfaces for testability** — Services never import Drizzle. Tests use in-memory repositories from `src/db/repositories/memory/`, achieving zero external calls across the full test suite.

**Injected CoachFn** — Tests use `nullCoach`, production optionally wires in `createClaudeCoach()` when `ANTHROPIC_API_KEY` is set.

**Domain extensibility** — New domains implement `DomainModule` (see `src/core/domain.ts`) and register at boot in CLI/MCP entry points via `registerDomain()` + `registerRule()`.

### Testing

Tests live in `tests/` mirroring `src/` structure. All tests use in-memory repository doubles and `nullCoach` — no database, no network. Shared fixtures are in `tests/fixtures/`. Vitest config uses `~` as a path alias for `src/`.

### Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./trainr.db` (local SQLite), `libsql://...` (Turso), `:memory:` (tests) |
| `ANTHROPIC_API_KEY` | Optional — enables AI coaching |
| `TRAINR_API_KEY` | MCP HTTP transport auth |

### TypeScript Configuration

Strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `noImplicitOverride` enabled. Target ES2022, NodeNext module resolution.
