import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG, type AppConfig } from '../config.js';
import { DbService } from './db.service.js';

/** Tells the Next.js guest site to drop cached pages for a property after an owner edit. */
@Injectable()
export class RevalidateService {
  private readonly log = new Logger(RevalidateService.name);
  constructor(
    private readonly db: DbService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  property(propertyId: string): void {
    if (!this.config.WEB_REVALIDATE_URL) return;
    this.send(propertyId).catch((err) => this.log.warn(`revalidate failed: ${err.message}`));
  }

  private async send(propertyId: string): Promise<void> {
    // The web app caches site data by the key it was requested with: slug or custom domain.
    const p = await this.db.one<{ slug: string; custom_domain: string | null }>(
      `select slug, custom_domain from property where id = $1`,
      [propertyId],
    );
    const tags = [`property:${propertyId}`];
    if (p) tags.push(`site:${p.slug}`);
    if (p?.custom_domain) tags.push(`site:${p.custom_domain}`);
    await fetch(this.config.WEB_REVALIDATE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': this.config.REVALIDATE_SECRET },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5_000),
    });
  }
}
