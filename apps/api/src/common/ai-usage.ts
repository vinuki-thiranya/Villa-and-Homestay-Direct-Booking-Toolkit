import type Anthropic from '@anthropic-ai/sdk';
import type { DbService } from './db.service.js';

/*
 * Claude spend per property per month (ai_usage), shared by the concierge and the site-content
 * drafter. Owners see it on the concierge settings page; spec §7 budgets about USD 1 a month.
 */

type Usage = Anthropic.Beta.Messages.BetaUsage;

/** USD per million tokens: input, cache write (5 min), cache read, output. Unknown models use Opus 5.5 pricing. */
const PRICES: Record<string, [number, number, number, number]> = {
  'claude-opus-5-5': [4, 5, 0.2, 20],
  'claude-sonnet-5-5': [2, 2.5, 0.2, 10],
  'claude-haiku-5-5': [0.1, 0.125, 0.01, 0.5],
};

export function month(): string {
  return new Date().toISOString().slice(0, 7);
}

export function aiCostUsd(model: string, u: Usage, fallbackModel: string): number {
  const [pin, pwrite, pread, pout] = PRICES[model] ?? PRICES[fallbackModel] ?? PRICES['claude-opus-5-5']!;
  const write = u.cache_creation_input_tokens ?? 0;
  const read = u.cache_read_input_tokens ?? 0;
  return (u.input_tokens * pin + write * pwrite + read * pread + u.output_tokens * pout) / 1_000_000;
}

export async function monthCostUsd(db: DbService, propertyId: string): Promise<number> {
  const row = await db.one<{ cost_usd: number }>(`select cost_usd from ai_usage where property_id = $1 and month = $2`, [propertyId, month()]);
  return Number(row?.cost_usd ?? 0);
}

/** Adds one model call to this month's row; `generation` also counts a site-content draft. */
export async function recordAiUsage(
  db: DbService,
  ids: { tenantId: string; propertyId: string },
  response: { model: string; usage: Usage },
  fallbackModel: string,
  opts: { generation?: boolean } = {},
): Promise<void> {
  const u = response.usage;
  const write = u.cache_creation_input_tokens ?? 0;
  const read = u.cache_read_input_tokens ?? 0;
  await db.query(
    `insert into ai_usage (tenant_id, property_id, month, requests, input_tokens, cache_read_tokens, output_tokens, cost_usd, content_generations)
     values ($1, $2, $3, 1, $4, $5, $6, $7, $8)
     on conflict (property_id, month) do update set requests = ai_usage.requests + 1,
       input_tokens = ai_usage.input_tokens + excluded.input_tokens, cache_read_tokens = ai_usage.cache_read_tokens + excluded.cache_read_tokens,
       output_tokens = ai_usage.output_tokens + excluded.output_tokens, cost_usd = ai_usage.cost_usd + excluded.cost_usd,
       content_generations = ai_usage.content_generations + excluded.content_generations`,
    [ids.tenantId, ids.propertyId, month(), u.input_tokens + write, read, u.output_tokens, aiCostUsd(response.model, u, fallbackModel), opts.generation ? 1 : 0],
  );
}
