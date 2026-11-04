import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../../common/db.service.js';
import { FxService } from '../fx/fx.service.js';
import { IcalService } from '../ical/ical.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OpsService } from '../ops/ops.service.js';
import { SequencesService } from '../sequences/sequences.service.js';

/** The recurring jobs. Each is safe to run concurrently with itself and idempotent. */
@Injectable()
export class JobsService {
  private readonly log = new Logger(JobsService.name);

  constructor(
    private readonly db: DbService,
    private readonly inventory: InventoryService,
    private readonly ical: IcalService,
    private readonly fx: FxService,
    private readonly notify: NotificationsService,
    private readonly ops: OpsService,
    private readonly sequences: SequencesService,
  ) {}

  /** Every minute: expire holds, abandon their pending bookings (spec §6 hold). */
  async sweepHolds(): Promise<number> {
    const abandoned = await this.db.tx((tx) => this.inventory.releaseExpiredHolds(tx));
    if (abandoned.length) this.log.log(`released ${abandoned.length} expired hold(s)`);
    return abandoned.length;
  }

  /** Every 5 minutes: "still want these dates?" one hour after abandonment (spec §4.1 step 5). */
  async abandonedFollowups(): Promise<number> {
    const rows = await this.db.query<{ id: string }>(
      `update booking b set abandoned_followup_sent_at = now()
        where b.status = 'abandoned' and b.abandoned_followup_sent_at is null and b.source = 'direct'
          and b.updated_at < now() - interval '1 hour' and b.updated_at > now() - interval '2 days'
          and not exists (select 1 from booking n where n.guest_id = b.guest_id and n.created_at > b.created_at
                          and n.status in ('pending', 'confirmed'))
        returning b.id`,
    );
    for (const r of rows) await this.notify.abandonedFollowup(r.id).catch((e) => this.log.warn(e.message));
    return rows.length;
  }

  /** Every 15 minutes (spec §4.6). */
  async syncIcal(): Promise<void> {
    const results = await this.ical.syncAll();
    const failed = results.filter((r) => !r.ok).length;
    const conflicts = results.reduce((s, r) => s + r.conflicts, 0);
    this.log.log(`iCal sync: ${results.length} feed(s), ${failed} failed, ${conflicts} new conflict(s)`);
  }

  /** Every 15 minutes: pre-arrival, arrival, mid-stay and check-out messages (sends only 08:00–21:00 local). */
  runSequences(): Promise<number> {
    return this.sequences.run();
  }

  /** Hourly: builds each property's task board once its local time passes 06:00. */
  buildTaskBoards(): Promise<number> {
    return this.ops.buildDailyBoards();
  }

  /** Daily: "book direct next time" codes 11 months after a stay. */
  repeatGuestCodes(): Promise<number> {
    return this.sequences.repeatGuestCodes();
  }

  /** Daily. */
  refreshFx(): Promise<number> {
    return this.fx.refresh();
  }
}

export const SCHEDULE = [
  { name: 'sweep-holds', everyMs: 60_000, run: (j: JobsService) => j.sweepHolds() },
  { name: 'abandoned-followups', everyMs: 5 * 60_000, run: (j: JobsService) => j.abandonedFollowups() },
  { name: 'ical-sync', everyMs: 15 * 60_000, run: (j: JobsService) => j.syncIcal() },
  { name: 'fx-refresh', everyMs: 24 * 3_600_000, run: (j: JobsService) => j.refreshFx() },
  { name: 'sequences', everyMs: 15 * 60_000, run: (j: JobsService) => j.runSequences() },
  { name: 'task-boards', everyMs: 60 * 60_000, run: (j: JobsService) => j.buildTaskBoards() },
  { name: 'repeat-guest-codes', everyMs: 24 * 3_600_000, run: (j: JobsService) => j.repeatGuestCodes() },
] as const;
