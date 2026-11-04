import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG, type AppConfig } from '../config.js';

/** Tells the Next.js guest site to drop cached pages for a property after an owner edit. */
@Injectable()
export class RevalidateService {
  private readonly log = new Logger(RevalidateService.name);
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  property(propertyId: string): void {
    if (!this.config.WEB_REVALIDATE_URL) return;
    fetch(this.config.WEB_REVALIDATE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': this.config.REVALIDATE_SECRET },
      body: JSON.stringify({ tags: [`property:${propertyId}`] }),
      signal: AbortSignal.timeout(5_000),
    }).catch((err) => this.log.warn(`revalidate failed: ${err.message}`));
  }
}
