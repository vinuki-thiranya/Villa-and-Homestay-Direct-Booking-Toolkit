/**
 * Backup restore drill (spec §5: daily backups, monthly restore drill; docs/go-live-checklist.md).
 *
 * Dump mode (CI, or any copy you can reach):
 *   SOURCE_DATABASE_URL=… TARGET_DATABASE_URL=… npm run restore-drill -w @staydirect/api
 *   pg_dump the source, pg_restore into the target (which must be an empty database), then check it.
 * Compare mode (monthly, after Supabase "restore to a new project"):
 *   … COMPARE_ONLY=1 npm run restore-drill -w @staydirect/api
 *   checks the restored project against production without copying data anywhere.
 *
 * Checks: same latest migration, same tables, row counts (exact in dump mode; in compare mode every
 * table with rows in the source has rows in the restore), row-level security and policies intact,
 * the append-only money triggers present, and a booking-with-guest query that answers.
 * pg_dump / pg_restore come from PATH or PG_BIN, and must be the server's major version or newer.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Money tables refuse UPDATE and DELETE (CLAUDE.md rules 3 and 14); a restore must keep that. */
export const APPEND_ONLY_TRIGGERS = [
  'trg_payment_append_only',
  'trg_audit_append_only',
  'trg_invoice_append_only',
  'trg_ledger_append_only',
  'trg_owner_statement_append_only',
];

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

function client(url: string) {
  return new pg.Client({ connectionString: url, ssl: /supabase|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined });
}

async function snapshot(url: string) {
  const c = client(url);
  await c.connect();
  try {
    const tables = (await c.query(`select tablename from pg_tables where schemaname = 'public' order by tablename`)).rows.map((r) => r.tablename as string);
    const counts: Record<string, number> = {};
    for (const t of tables) counts[t] = Number((await c.query(`select count(*) as n from "${t}"`)).rows[0].n);
    const latest = tables.includes('schema_migrations') ? ((await c.query(`select max(name) as m from schema_migrations`)).rows[0].m as string | null) : null;
    const rls = (await c.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity order by relname`)).rows.map((r) => r.relname as string);
    const policies = (await c.query(`select tablename || '.' || policyname as p from pg_policies where schemaname = 'public' order by 1`)).rows.map((r) => r.p as string);
    const triggers = (await c.query(`select tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal order by 1`)).rows.map((r) => r.tgname as string);
    let sample = 'no bookings';
    if (tables.includes('booking') && tables.includes('guest')) {
      const r = (await c.query(`select count(*) as n from booking b left join guest g on g.id = b.guest_id left join room r on r.id = b.room_id`)).rows[0];
      sample = `${r.n} booking(s) readable with guest and room`;
    }
    return { tables, counts, latest, rls, policies, triggers, sample };
  } finally {
    await c.end();
  }
}

const missing = (want: string[], have: string[]) => want.filter((x) => !have.includes(x));

/** Compares a restored database with its source. Exact row counts unless `loose` (restore of an older backup). */
export async function compare(sourceUrl: string, targetUrl: string, loose = false): Promise<Check[]> {
  const [s, t] = await Promise.all([snapshot(sourceUrl), snapshot(targetUrl)]);
  const checks: Check[] = [];
  checks.push({ name: 'latest migration', ok: !!t.latest && t.latest === s.latest, detail: `source ${s.latest ?? 'none'}, restore ${t.latest ?? 'none'}` });
  const lostTables = missing(s.tables, t.tables);
  checks.push({ name: 'tables', ok: lostTables.length === 0, detail: lostTables.length ? `missing: ${lostTables.join(', ')}` : `${t.tables.length} tables` });
  const badCounts = s.tables
    .filter((x) => t.tables.includes(x))
    .filter((x) => (loose ? s.counts[x]! > 0 && t.counts[x] === 0 : s.counts[x] !== t.counts[x]))
    .map((x) => `${x} ${s.counts[x]} → ${t.counts[x]}`);
  const rows = Object.values(t.counts).reduce((a, b) => a + b, 0);
  checks.push({ name: loose ? 'row counts (no table emptied)' : 'row counts (exact)', ok: badCounts.length === 0, detail: badCounts.length ? badCounts.slice(0, 15).join('; ') : `${rows} rows` });
  const lostRls = missing(s.rls, t.rls);
  checks.push({ name: 'row-level security', ok: lostRls.length === 0, detail: lostRls.length ? `off on: ${lostRls.join(', ')}` : `on for ${t.rls.length} tables` });
  const lostPolicies = missing(s.policies, t.policies);
  checks.push({ name: 'policies', ok: lostPolicies.length === 0, detail: lostPolicies.length ? `missing: ${lostPolicies.slice(0, 10).join(', ')}` : `${t.policies.length} policies` });
  const lostMoney = missing(APPEND_ONLY_TRIGGERS, t.triggers);
  const lostTriggers = missing(s.triggers, t.triggers);
  checks.push({
    name: 'append-only money triggers',
    ok: lostMoney.length === 0 && lostTriggers.length === 0,
    detail: lostTriggers.length ? `missing: ${lostTriggers.join(', ')}` : `${t.triggers.length} triggers`,
  });
  checks.push({ name: 'booking query', ok: t.sample !== 'no bookings' || s.sample === 'no bookings', detail: t.sample });
  return checks;
}

function run(cmd: string, args: string[]): Promise<void> {
  const bin = process.env.PG_BIN ? join(process.env.PG_BIN, cmd) : cmd;
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', (err) => reject(new Error(`${cmd} not found (${err.message}). Install the PostgreSQL client tools or set PG_BIN.`)));
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

/** pg_dump the source and pg_restore it into an empty target. */
export async function dumpAndRestore(sourceUrl: string, targetUrl: string): Promise<void> {
  const t = client(targetUrl);
  await t.connect();
  try {
    const n = Number((await t.query(`select count(*) as n from pg_tables where schemaname = 'public'`)).rows[0].n);
    if (n > 0) throw new Error('The target database is not empty. The drill restores into a fresh database only.');
    // Roles live outside a dump; the policies and grants refer to this one (migrations/0001_core.sql).
    await t.query(`do $$ begin if not exists (select 1 from pg_roles where rolname = 'staydirect_tenant') then create role staydirect_tenant nologin; end if; end $$`);
  } finally {
    await t.end();
  }
  const dir = await mkdtemp(join(tmpdir(), 'staydirect-drill-'));
  try {
    const file = join(dir, 'backup.dump');
    await run('pg_dump', ['--format=custom', '--no-owner', `--file=${file}`, `--dbname=${sourceUrl}`]);
    await run('pg_restore', ['--no-owner', '--exit-on-error', `--dbname=${targetUrl}`, file]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main() {
  const source = process.env.SOURCE_DATABASE_URL;
  const target = process.env.TARGET_DATABASE_URL;
  if (!source || !target) throw new Error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL');
  if (source === target) throw new Error('SOURCE and TARGET must be different databases');
  const compareOnly = process.env.COMPARE_ONLY === '1';
  const started = Date.now();
  if (!compareOnly) await dumpAndRestore(source, target);
  const checks = await compare(source, target, compareOnly);
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${c.detail}`);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\nRestore drill ${failed ? `FAILED (${failed} check(s))` : 'passed'} in ${Math.round((Date.now() - started) / 1000)} s`);
  if (failed) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
