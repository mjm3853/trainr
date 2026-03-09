/**
 * Database client factory.
 * Selects the appropriate Drizzle driver based on DATABASE_URL.
 *
 * Supported URL schemes:
 *   file:./path.db          → libsql (local SQLite file)
 *   :memory:                → libsql (in-memory, for tests)
 *   libsql://...            → Turso (hosted libSQL)
 *   postgres://...          → PostgreSQL
 *   postgresql://...        → PostgreSQL
 */

import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';

export type Db = ReturnType<typeof drizzleLibSQL<typeof schema>>;

let _db: Db | null = null;

export function createDb(databaseUrl: string): Db {
  if (
    databaseUrl === ':memory:' ||
    databaseUrl.startsWith('file:') ||
    databaseUrl.startsWith('libsql:')
  ) {
    const client = createClient({ url: databaseUrl });
    return drizzleLibSQL(client, { schema });
  }

  // Postgres support — dynamically import to avoid loading pg when not needed
  throw new Error(
    `Postgres support requires 'drizzle-orm/postgres-js'. ` +
    `DATABASE_URL '${databaseUrl}' appears to be a Postgres URL. ` +
    `Migrate to libsql/Turso or add postgres driver support.`,
  );
}

/**
 * Returns the global DB singleton, initialized from DATABASE_URL env var.
 * Call initDb() before using getDb() in application code.
 */
export function initDb(databaseUrl?: string): Db {
  const url = databaseUrl ?? process.env['DATABASE_URL'] ?? 'file:./trainr.db';
  _db = createDb(url);
  return _db;
}

export function getDb(): Db {
  if (!_db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return _db;
}
