import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { CONFIG, type AppConfig } from '../config.js';
import { DbService } from './db.service.js';

/** Waits for the inventory transaction to commit, and folds a burst of changes into one call. */
const AVAILABILITY_DELAY_MS = 5_000;

/**
 * Tells the Next.js guest site to drop cached data for a property: pages after an owner edit
 * (`site:` tags), the availability calendar after nights change (`avail:` tags).
 */
@Injectable()
export class RevalidateService implements OnModuleDestroy {
  private readonly log = new Logger(RevalidateService.name);
  private readonly pendingRooms = new Map<string, NodeJS.Timeout>();
  private readonly listeners = new Set<(propertyId: string) => void>();

  constructor(
    private readonly db: DbService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** In-process caches (e.g. SiteFactsService) drop a property's entries when its data changes. */
  onChange(listener: (propertyId: string) => void): void {
    this.listeners.add(listener);
  }

  private changed(propertyId: string): void {
    for (const l of this.listeners) l(propertyId);
  }

  property(propertyId: string): void {
    this.changed(propertyId);
    if (!this.config.WEB_REVALIDATE_URL) return;
    this.siteKeys(`select id, slug, custom_domain from property where id = $1`, propertyId)
      .then((p) => (p ? this.post([`property:${propertyId}`, ...p.keys.map((k) => `site:${k}`)]) : this.post([`property:${propertyId}`])))
      .catch((err) => this.log.warn(`revalidate failed: ${err.message}`));
  }

  /**
   * Nights of a room changed (booking, hold, expiry, cancellation, block, iCal import). The guest
   * site's cached calendar is refreshed a few seconds later, once per room however many nights moved.
   */
  availability(roomId: string): void {
    if (this.pendingRooms.has(roomId)) return;
    const timer = setTimeout(() => {
      this.pendingRooms.delete(roomId);
      this.siteKeys(`select p.id, p.slug, p.custom_domain from room r join property p on p.id = r.property_id where r.id = $1`, roomId)
        .then((p) => {
          if (!p) return;
          this.changed(p.id);
          if (this.config.WEB_REVALIDATE_URL) return this.post(p.keys.map((k) => `avail:${k}`));
        })
        .catch((err) => this.log.warn(`availability revalidate failed: ${err.message}`));
    }, AVAILABILITY_DELAY_MS);
    timer.unref?.();
    this.pendingRooms.set(roomId, timer);
  }

  onModuleDestroy(): void {
    for (const t of this.pendingRooms.values()) clearTimeout(t);
    this.pendingRooms.clear();
  }

  /** The web app caches site data by the key it was requested with: slug or custom domain. */
  private async siteKeys(sql: string, id: string): Promise<{ id: string; keys: string[] } | null> {
    const p = await this.db.one<{ id: string; slug: string; custom_domain: string | null }>(sql, [id]);
    if (!p) return null;
    return { id: p.id, keys: [p.slug, ...(p.custom_domain ? [p.custom_domain] : [])] };
  }

  private async post(tags: string[]): Promise<void> {
    await fetch(this.config.WEB_REVALIDATE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': this.config.REVALIDATE_SECRET },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5_000),
    });
  }
}
