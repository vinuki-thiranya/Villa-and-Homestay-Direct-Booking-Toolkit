import { Inject, Injectable, Logger } from '@nestjs/common';
import { DISPLAY_CURRENCIES, type FxTable } from '@staydirect/shared';
import { DbService } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';

/** Used until the first successful fetch so a fresh install can still show prices. */
const FALLBACK: FxTable = { USD: 1, LKR: 300, EUR: 0.92, GBP: 0.79, INR: 84 };

@Injectable()
export class FxService {
  private readonly log = new Logger(FxService.name);
  private cache: { table: FxTable; at: number } | null = null;

  constructor(
    private readonly db: DbService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** Units per USD for every display currency. Cached for 10 minutes. */
  async table(): Promise<FxTable> {
    if (this.cache && Date.now() - this.cache.at < 600_000) return this.cache.table;
    const rows = await this.db.query<{ quote: string; rate: number }>(`select quote, rate from fx_rate where base = 'USD'`);
    const table: FxTable = { ...FALLBACK };
    for (const r of rows) table[r.quote] = r.rate;
    table.USD = 1;
    this.cache = { table, at: Date.now() };
    return table;
  }

  /** Daily job: fetch the open rate feed. On failure the last known rates stay in place. */
  async refresh(): Promise<number> {
    try {
      const res = await fetch(this.config.FX_FEED_URL, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { rates?: Record<string, number> };
      const rates = body.rates ?? {};
      let n = 0;
      for (const quote of DISPLAY_CURRENCIES) {
        const rate = rates[quote];
        if (!rate || quote === 'USD') continue;
        await this.db.query(
          `insert into fx_rate (base, quote, rate, fetched_at) values ('USD', $1, $2, now())
           on conflict (base, quote) do update set rate = excluded.rate, fetched_at = excluded.fetched_at`,
          [quote, rate],
        );
        n++;
      }
      this.cache = null;
      return n;
    } catch (err) {
      this.log.warn(`FX refresh failed, keeping last known rates: ${(err as Error).message}`);
      return 0;
    }
  }
}
