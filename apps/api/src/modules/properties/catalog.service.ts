import { Inject, Injectable } from '@nestjs/common';
import { GatewayConfigSchema, type GatewayConfig } from '@staydirect/shared';
import type pg from 'pg';
import { decryptJson } from '../../common/crypto.js';
import { DbService, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';

export interface PropertyBundle {
  property: Row;
  rooms: Row[];
  plans: Row[];
  tenant: Row;
}

/**
 * System-context reads of a property and everything pricing needs. Used by the public guest site,
 * webhooks and workers (no tenant session). Owner endpoints use PropertiesService with RLS.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly db: DbService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  /** Resolve a guest site key: a slug ("villa-lagoon") or a custom domain ("villalagoon.com"). */
  async propertyBySite(site: string, db: pg.PoolClient | pg.Pool = this.db.pool): Promise<Row | null> {
    const key = site.toLowerCase().replace(/^www\./, '');
    return this.db.one(
      `select * from property where published and (slug = $1 or custom_domain = $1 or custom_domain = 'www.' || $1)`,
      [key],
      db,
    );
  }

  async bundle(propertyId: string, db: pg.PoolClient | pg.Pool = this.db.pool): Promise<PropertyBundle | null> {
    const property = await this.db.one(`select * from property where id = $1`, [propertyId], db);
    if (!property) return null;
    const [rooms, plans, tenant] = await Promise.all([
      this.db.query(`select * from room where property_id = $1 and active order by sort_order, name`, [propertyId], db),
      this.db.query(`select * from rate_plan where property_id = $1 and active order by priority, created_at`, [propertyId], db),
      this.db.one(`select * from tenant where id = $1`, [property.tenant_id], db),
    ]);
    return { property, rooms, plans, tenant: tenant! };
  }

  gatewayConfig(property: Row): GatewayConfig | null {
    if (!property.gateway_config) return null;
    const raw = decryptJson<unknown>(property.gateway_config, this.config.ENCRYPTION_KEY);
    return GatewayConfigSchema.parse(raw);
  }

  /** Public URL of a property's guest site. */
  siteUrl(property: Row): string {
    if (property.custom_domain) return `https://${property.custom_domain}`;
    if (this.config.NODE_ENV === 'production') return `https://${property.slug}.${this.config.ROOT_DOMAIN}`;
    return `${this.config.WEB_URL.replace(/\/$/, '')}/${property.slug}`;
  }

  mapsUrl(property: Row): string | null {
    if (property.lat != null && property.lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}`;
    }
    if (property.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`;
    return null;
  }

  bookingEnabled(tenant: Row): boolean {
    return tenant.billing_status !== 'suspended';
  }
}
