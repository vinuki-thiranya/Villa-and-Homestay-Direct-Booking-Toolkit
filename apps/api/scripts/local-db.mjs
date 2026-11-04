// Embedded Postgres for local development (no Docker). Data lives in apps/api/.pgdata.
// Usage: npm run db:local   → then in another terminal: npm run db:migrate && npm run db:seed
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), '.pgdata');
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'postgres',
  password: 'postgres',
  port: 54329,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

const fresh = !existsSync(join(dir, 'PG_VERSION'));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('staydirect');
console.log('Postgres running: postgres://postgres:postgres@localhost:54329/staydirect  (Ctrl+C to stop)');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
