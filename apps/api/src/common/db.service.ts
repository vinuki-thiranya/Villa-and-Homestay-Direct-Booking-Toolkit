import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { CONFIG, type AppConfig } from '../config.js';

// Dates stay as 'YYYY-MM-DD' strings (no timezone shifts); numerics become JS numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export type Db = pg.PoolClient | pg.Pool;
export type Row = Record<string, any>;

export interface TxOptions {
  /** Run as the RLS-restricted role for this tenant (owner/manager requests). */
  tenantId?: string;
  isolation?: 'read committed' | 'repeatable read' | 'serializable';
}

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool: pg.Pool;

  constructor(@Inject(CONFIG) config: AppConfig) {
    this.pool = new pg.Pool({
      connectionString: config.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      ssl: /supabase|sslmode=require/.test(config.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
    });
  }

  async query<T extends Row = Row>(sql: string, params: unknown[] = [], db: Db = this.pool): Promise<T[]> {
    const res = await db.query(sql, params as any[]);
    return res.rows as T[];
  }

  async one<T extends Row = Row>(sql: string, params: unknown[] = [], db: Db = this.pool): Promise<T | null> {
    const rows = await this.query<T>(sql, params, db);
    return rows[0] ?? null;
  }

  /** Run fn inside a transaction. All inventory and money writes must go through here. */
  async tx<T>(fn: (client: pg.PoolClient) => Promise<T>, opts: TxOptions = {}): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query(`begin isolation level ${opts.isolation ?? 'read committed'}`);
      if (opts.tenantId) {
        await client.query('set local role staydirect_tenant');
        await client.query(`select set_config('app.tenant_id', $1, true)`, [opts.tenantId]);
      }
      const result = await fn(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  withTenant<T>(tenantId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    return this.tx(fn, { tenantId });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = err as { code?: string; constraint?: string };
  return e?.code === '23505' && (!constraint || e.constraint === constraint);
}
