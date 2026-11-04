import EmbeddedPostgres from 'embedded-postgres';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { migrate } from '../scripts/migrate.js';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Integration tests run against real Postgres: the unique-index and transaction guarantees are
 * the thing under test, so no mocks. Uses TEST_DATABASE_URL if set (it is wiped!), otherwise an
 * embedded Postgres 17 in a temp dir.
 */
export default async function setup(project: TestProject) {
  let url = process.env.TEST_DATABASE_URL;
  let stop = async () => {};
  if (url) {
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    await c.query('drop schema public cascade; create schema public;');
    await c.end();
  } else {
    const port = 55000 + Math.floor(Math.random() * 1000);
    const dir = join(tmpdir(), `staydirect-test-${process.pid}-${Date.now()}`);
    const db = new EmbeddedPostgres({ databaseDir: dir, port, user: 'postgres', password: 'postgres', persistent: true, initdbFlags: ['--encoding=UTF8', '--locale=C'], onLog: () => {} });
    await db.initialise();
    await db.start();
    await db.createDatabase('staydirect_test');
    url = `postgres://postgres:postgres@localhost:${port}/staydirect_test`;
    stop = async () => {
      await db.stop();
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    };
  }
  await migrate(url, () => {});
  project.provide('databaseUrl', url);
  return stop;
}
