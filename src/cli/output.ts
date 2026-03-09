/**
 * Shared output formatter — all commands route through this.
 * Supports --output json|ndjson|human (default: human).
 */

export type OutputFormat = 'human' | 'json' | 'ndjson';

export function parseOutputFormat(flag: string | undefined): OutputFormat {
  if (flag === 'json') return 'json';
  if (flag === 'ndjson') return 'ndjson';
  return 'human';
}

export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

export function outputNdjson(records: unknown[]): void {
  for (const record of records) {
    process.stdout.write(JSON.stringify(record) + '\n');
  }
}

/**
 * Apply field mask — return only the requested fields from each object.
 * Fields is a comma-separated string: "id,completedAt,domain"
 */
export function applyFieldMask<T extends Record<string, unknown>>(
  obj: T,
  fields: string | undefined,
): Partial<T> {
  if (!fields) return obj;
  const keys = fields.split(',').map((f) => f.trim());
  return Object.fromEntries(
    keys.filter((k) => k in obj).map((k) => [k, obj[k]]),
  ) as Partial<T>;
}
