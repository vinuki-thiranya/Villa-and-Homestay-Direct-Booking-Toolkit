/**
 * Applies apps/api/migrations/*.sql in filename order, each in its own transaction,
 * recording applied files in schema_migrations. Usage: npm run db:migrate
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
// scripts/ when run from source (tests), dist/scripts/ when compiled
export const MIGRATIONS_DIR = [join(here, '..', 'migrations'), join(here, '..', '..', 'migrations')].find(existsSync)!;

export async function migrate(databaseUrl: string, log: (s: string) => void = console.log): Promise<string[]> {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: /supabase|sslmode=require/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set((await client.query(`select name from schema_migrations`)).rows.map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    const applied: string[] = [];
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, f), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(`insert into schema_migrations (name) values ($1)`, [f]);
        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        throw new Error(`Migration ${f} failed: ${(err as Error).message}`);
      }
      log(`applied ${f}`);
      applied.push(f);
    }
    if (applied.length === 0) log('database is up to date');
    return applied;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  migrate(url).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
