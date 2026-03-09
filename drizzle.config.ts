import type { Config } from 'drizzle-kit';

const url = process.env['DATABASE_URL'] ?? 'file:./trainr.db';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: url.startsWith('postgres') ? 'postgresql' : 'sqlite',
  dbCredentials: url.startsWith('postgres')
    ? { url }
    : { url: url.replace('file:', '') },
} satisfies Config;
