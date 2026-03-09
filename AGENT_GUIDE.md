# AI Agent Usage Guide

trainr is explicitly designed for AI agent consumption. This guide explains best practices for integrating trainr into agentic workflows.

## Quick Reference

| Goal | Command | Agent Use | Notes |
|------|---------|-----------|-------|
| Check today's plan | `trainr session next --output json` | ✅ Recommended | Deterministic, no side effects |
| Get program position | `trainr program status --output json` | ✅ Recommended | Scalar response, quick |
| List all programs | `trainr program list --output json` | ✅ Recommended | Filter multiple active programs |
| View session history | `trainr history --output json` | ✅ Recommended | Past sessions available |
| Get data types | `trainr schema session.next` | ✅ Use at startup | Validate responses, discover API |
| Create program | `trainr program new` | ❌ Avoid | Interactive wizard, not automatable |
| Log session | `trainr session start` | ❌ Avoid | Interactive prompts, use MCP instead |
| Ask coach | `trainr coach ask "..."` | ⚠️ Use MCP | Requires API key, interactive |

## Core Patterns

### 1. Startup: Schema Introspection

When your agent starts, fetch the available schemas to understand the CLI contract:

```bash
trainr schema
# Returns:
# {
#   "available": [
#     "session.next",
#     "session.log",
#     "session.skip",
#     "program.new",
#     "program.status",
#     "context"
#   ],
#   "usage": "trainr schema <command>"
# }
```

Cache these schemas to validate outputs and understand intent:

```bash
for schema in session.next session.log session.skip program.new program.status context; do
  trainr schema "$schema" > schemas/"$schema".json
done
```

### 2. State Queries: Read Program & Session Info

All read operations are safe, idempotent, and deterministic:

```bash
# Get today's planned session
trainr session next --output json

# Check current program position
trainr program status --output json

# List all active programs
trainr program list --output json

# Get session history (recent 20)
trainr history 20 --output json

# Get detailed record for specific session
trainr history --session <session-id> --output json

# Filter history by program
trainr history 10 --program <program-id> --output json
```

All return JSON with consistent structure. Exit code 0 = success, 1 = error.

### 3. Error Handling

Check exit codes and stderr:

```bash
if output=$(trainr session next --output json 2>&1); then
  # Parse JSON response
  position=$(echo "$output" | jq '.position')
else
  # Handle error
  echo "Error fetching session: $output"
fi
```

Common errors:

- `No active programs.` — User hasn't created any program yet
- `Program '<id>' not found` — Invalid program ID
- `Session '<id>' not found` — Invalid session ID

### 4. Output Formats

#### JSON (Recommended for Agents)

Fully structured, type-validated, parser-friendly:

```bash
trainr session next --output json | jq '.session.activities[0]'
```

Output is predictable:

- All objects have documented fields (via schema)
- Nulls for missing optional fields
- Dates in ISO-8601 UTC
- IDs are UUIDs (or short IDs)

#### NDJSON (Experimental)

Streaming format, one JSON object per line:

```bash
trainr program list --output ndjson
```

**Caveat:** Field masking via `--fields` is documented but not fully implemented; all fields are always returned.

#### Human (Not for Agents)

Pretty-printed for human readability. Avoid parsing this — output format may change.

```bash
trainr session next  # Returns formatted text with emojis and alignment
```

### 5. Schema Validation

Use schemas to validate payloads before executing mutations:

```bash
# Get the schema for session context input
trainr schema context | jq '.input.definitions.SessionContext.properties' > context-schema.json

# Validate agent-generated context before passing to CLI
# (Currently context can only be provided interactively, but this pattern applies to future mutations)
```

## Advanced: MCP Server

For tighter integration or bidirectional streaming, use the MCP (Model Context Protocol) server:

```bash
MCP_TRANSPORT=stdio npm run mcp:stdio
```

The MCP server exposes the same 6 tools as the CLI commands, but with better error handling and streaming capabilities. Use this if:

- You need to stream large session histories
- You want native MCP integration (e.g., Claude's tools)
- You prefer binary protocol over JSON-over-stdin

## Limitations & Workarounds

### Limitation: Can't Create Programs Programmatically

**Problem:** `trainr program new` is an interactive wizard.

**Workaround:**

- Have the user create programs via `npm run dev -- program new` (interactive)
- Then agent queries them via `trainr program status`
- For mass testing, use MCP server with direct tool access

### Limitation: Can't Log Sessions via CLI

**Problem:** `trainr session start` collects context via interactive prompts.

**Workaround:**

- Use MCP `session_log` tool to log sessions directly with JSON payloads
- Or call the internal service layer if you're embedding trainr in Node.js

### Limitation: Coach Requires API Key

**Problem:** `trainr coach ask` fails silently if `ANTHROPIC_API_KEY` not set.

**Workaround:**

- Check `process.env.ANTHROPIC_API_KEY` before calling
- Use MCP `coach_ask` tool (includes better error messages)
- Or skip coaching entirely — trainr is fully functional without AI

### Limitation: Field Masking Incomplete

**Problem:** `--fields id,name` doesn't filter NDJSON output.

**Workaround:**

- Request JSON and filter with `jq`: `trainr program list --output json | jq '.[] | {id, name}'`
- Or use MCP `history_list` tool which supports true field filtering

## Example: Complete Agent Workflow

```bash
#!/bin/bash
# Agents should follow this pattern:

# 1. Introspect schemas (once at startup)
trainr schema > schemas.json

# 2. Check current state
session=$(trainr session next --output json)
position=$(echo "$session" | jq '.position')
activities=$(echo "$session" | jq '.session.activities | length')

echo "Today's session: $position ($activities activities)"

# 3. Validate agent intent against schemas
trainr schema session.next | jq '.output.definitions.SessionNext'

# 4. Log decisions
trainr history --output json | jq '.[-1]'

# 5. Handle errors gracefully
if ! trainr program status --output json > /dev/null 2>&1; then
  echo "No programs found — user needs to create one interactively first"
  exit 1
fi
```

## CLI Stability

The CLI follows semantic versioning:

- **v0.x:** Breaking changes possible (currently here)
- **v1.x:** Stable schema, guaranteed compatibility

Schemas (`trainr schema`) are forward-compatible within major versions.

Exit codes are stable:

- `0` = success
- `1` = error (any kind)

JSON output structure is versioned implicitly; breaking changes bump major version.

## Recommended Setup

```bash
# Install dependencies
npm install

# Set database to file-based SQLite
export DATABASE_URL="file:./trainr.db"

# (Optional) Enable AI coaching
export ANTHROPIC_API_KEY="sk-ant-..."

# Agent starts here:
npx trainr session next --output json
```

## How trainr Differs from ML/Agent Frameworks

- **No implicit I/O:** Agents must explicitly request output format
- **No streaming JSON:** Entire response buffered, then output (good for validation, slower for huge datasets)
- **No batch operations:** One command = one query (use MCP for batches)
- **No query language:** CLI has fixed operations; use direct DB access for complex queries
- **No async notifications:** Polling only (no webhooks)

For production agent deployments:

- Use **MCP server** for native integration
- Set `DATABASE_URL` to **Turso** (libSQL cloud) for durability
- Or embed trainr's services directly in your agent runtime (TypeScript only)
