import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { todayIn, type SessionUser } from '@staydirect/shared';
import type pg from 'pg';
import { DbService, type Row } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { FlagsService } from '../flags/flags.service.js';
import { WhatsAppChannel } from '../notifications/channels.js';
import { CatalogService } from '../properties/catalog.service.js';
import { StorageService } from '../storage/storage.service.js';

const BOARD_HOUR = 6; // spec §5: "at 6 am a job builds the task board"

export function toTask(t: Row) {
  return {
    id: t.id,
    propertyId: t.property_id,
    roomId: t.room_id,
    roomName: t.room_name ?? null,
    bookingId: t.booking_id,
    bookingReference: t.reference ?? null,
    date: t.date,
    type: t.type,
    title: t.title,
    assigneeStaffId: t.assignee_staff_id,
    assigneeName: t.staff_name ?? null,
    status: t.status,
    photos: t.photos ?? [],
    notes: t.notes,
    cost: t.cost,
    completedAt: t.completed_at,
    source: t.source,
  };
}

function toStaff(s: Row, siteBase?: string) {
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    role: s.role,
    active: s.active,
    taskListUrl: siteBase ? `${siteBase}/t/${s.access_token}` : undefined,
  };
}

const TASK_SELECT = `
  select t.*, r.name as room_name, s.name as staff_name, b.reference
    from task t left join room r on r.id = t.room_id left join staff s on s.id = t.assignee_staff_id
    left join booking b on b.id = t.booking_id`;

/** Housekeeping and operations (spec §3.6): daily board, cleaner list by WhatsApp link, maintenance log. */
@Injectable()
export class OpsService {
  private readonly log = new Logger(OpsService.name);

  constructor(
    private readonly db: DbService,
    private readonly catalog: CatalogService,
    private readonly whatsapp: WhatsAppChannel,
    private readonly storage: StorageService,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly flags: FlagsService,
  ) {}

  /** Base URL of the owner-facing web app pages that staff open (no login). */
  private staffBase(): string {
    return this.config.OWNER_APP_URL.replace(/\/owner\/?$/, '');
  }

  // ---------------------------------------------------------------- staff
  listStaff(user: SessionUser, propertyId: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(`select * from staff where property_id = $1 order by active desc, name`, [propertyId], tx);
      return rows.map((s) => toStaff(s, this.staffBase()));
    });
  }

  createStaff(user: SessionUser, propertyId: string, input: { name: string; phone: string | null; role: string; active: boolean }) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.requireProperty(tx, propertyId);
      const row = await this.db.one(
        `insert into staff (tenant_id, property_id, name, phone, role, active) values ($1, $2, $3, $4, $5, $6) returning *`,
        [user.tenantId, propertyId, input.name, input.phone, input.role, input.active],
        tx,
      );
      return toStaff(row!, this.staffBase());
    });
  }

  updateStaff(user: SessionUser, staffId: string, input: Partial<{ name: string; phone: string | null; role: string; active: boolean }>) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(
        `update staff set name = coalesce($2, name), phone = case when $3::boolean then $4 else phone end,
                role = coalesce($5, role), active = coalesce($6, active)
          where id = $1 returning *`,
        [staffId, input.name ?? null, input.phone !== undefined, input.phone ?? null, input.role ?? null, input.active ?? null],
        tx,
      );
      if (!row) throw new NotFoundException('Staff member not found');
      return toStaff(row, this.staffBase());
    });
  }

  // ---------------------------------------------------------------- tasks (owner)
  listTasks(user: SessionUser, propertyId: string, from: string, to: string) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      const rows = await this.db.query(
        `${TASK_SELECT} where t.property_id = $1 and t.date >= $2 and t.date <= $3
          order by t.date, (t.status = 'done'), t.type, r.sort_order nulls last, t.created_at`,
        [propertyId, from, to],
        tx,
      );
      return rows.map(toTask);
    });
  }

  createTask(
    user: SessionUser,
    propertyId: string,
    input: { date: string; type: string; title: string; roomId: string | null; assigneeStaffId: string | null; notes: string; cost: number | null },
  ) {
    return this.db.withTenant(user.tenantId, async (tx) => {
      await this.requireProperty(tx, propertyId);
      const row = await this.db.one(
        `insert into task (tenant_id, property_id, room_id, date, type, title, assignee_staff_id, notes, cost)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
        [user.tenantId, propertyId, input.roomId, input.date, input.type, input.title, input.assigneeStaffId, input.notes, input.cost],
        tx,
      );
      return toTask((await this.db.one(`${TASK_SELECT} where t.id = $1`, [row!.id], tx))!);
    });
  }

  updateTask(user: SessionUser, taskId: string, input: { status?: string; assigneeStaffId?: string | null; notes?: string; cost?: number | null; title?: string }) {
    return this.db.withTenant(user.tenantId, async (tx) => this.patchTask(tx, taskId, input));
  }

  async addTaskPhoto(user: SessionUser, taskId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    this.checkPhoto(file);
    const url = await this.storage.put(user.tenantId, 'tasks', file.buffer, file.mimetype);
    return this.db.withTenant(user.tenantId, async (tx) => {
      const row = await this.db.one(`update task set photos = array_append(photos, $2) where id = $1 returning id`, [taskId, url], tx);
      if (!row) throw new NotFoundException('Task not found');
      return toTask((await this.db.one(`${TASK_SELECT} where t.id = $1`, [taskId], tx))!);
    });
  }

  // ---------------------------------------------------------------- cleaner page (no login, token link)
  async staffTasks(token: string, date?: string) {
    const staff = await this.staffByToken(token);
    const property = (await this.db.one(`select name, timezone from property where id = $1`, [staff.property_id]))!;
    const day = date ?? todayIn(property.timezone);
    const rows = await this.db.query(
      `${TASK_SELECT} where t.property_id = $1 and t.date = $2 and (t.assignee_staff_id = $3 or t.assignee_staff_id is null)
        and t.type in ('clean', 'prepare', 'maintenance', 'shopping')
        order by (t.status = 'done'), t.type, r.sort_order nulls last`,
      [staff.property_id, day, staff.id],
    );
    return { staffName: staff.name, propertyName: property.name, date: day, tasks: rows.map(toTask) };
  }

  async staffUpdateTask(token: string, taskId: string, input: { status: string; notes?: string }) {
    const staff = await this.staffByToken(token);
    return this.db.tx(async (tx) => {
      const t = await this.db.one(`select id from task where id = $1 and property_id = $2`, [taskId, staff.property_id], tx);
      if (!t) throw new NotFoundException('Task not found');
      return this.patchTask(tx, taskId, { status: input.status, notes: input.notes, assigneeStaffId: staff.id });
    });
  }

  async staffAddPhoto(token: string, taskId: string, file: { buffer: Buffer; mimetype: string; size: number }) {
    const staff = await this.staffByToken(token);
    this.checkPhoto(file);
    const t = await this.db.one(`select id from task where id = $1 and property_id = $2`, [taskId, staff.property_id]);
    if (!t) throw new NotFoundException('Task not found');
    const url = await this.storage.put(staff.tenant_id, 'tasks', file.buffer, file.mimetype);
    await this.db.query(`update task set photos = array_append(photos, $2) where id = $1`, [taskId, url]);
    return { ok: true, url };
  }

  // ---------------------------------------------------------------- daily board job
  /**
   * Runs hourly; for each property whose local time has passed 06:00 and whose board for today is
   * not built yet: create clean tasks for check-outs and prepare tasks for check-ins, then send
   * every active cleaner their list link on WhatsApp. Idempotent per property and day.
   */
  async buildDailyBoards(now = new Date()): Promise<number> {
    const properties = await this.db.query(`select * from property where published`);
    let built = 0;
    for (const p of properties) {
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: p.timezone, hour: '2-digit', hourCycle: 'h23' }).format(now));
      if (hour < BOARD_HOUR) continue;
      const today = todayIn(p.timezone, now);
      if (!(await this.flags.enabled(p.tenant_id, 'housekeeping'))) continue;
      try {
        if (await this.buildBoard(p, today)) built++;
      } catch (err) {
        this.log.error(`task board for ${p.slug} failed: ${(err as Error).message}`);
      }
    }
    return built;
  }

  /** Owner-triggered build of today's board (tenant-checked, then the same idempotent build). */
  async buildBoardNow(user: SessionUser, propertyId: string) {
    const owned = await this.db.withTenant(user.tenantId, (tx) => this.db.one(`select id from property where id = $1`, [propertyId], tx));
    if (!owned) throw new NotFoundException('Property not found');
    await this.flags.require(user.tenantId, 'housekeeping');
    const p = (await this.db.one(`select * from property where id = $1`, [propertyId]))!;
    const date = todayIn(p.timezone);
    return { date, built: await this.buildBoard(p, date) };
  }

  async buildBoard(p: Row, date: string): Promise<boolean> {
    const result = await this.db.tx(async (tx) => {
      const claimed = await this.db.one(
        `insert into task_board_run (property_id, date, tenant_id, tasks, notified) values ($1, $2, $3, 0, 0)
         on conflict do nothing returning property_id`,
        [p.id, date, p.tenant_id],
        tx,
      );
      if (!claimed) return null;
      const departures = await this.db.query(
        `select b.id, b.room_id, r.name from booking b join room r on r.id = b.room_id
          where b.property_id = $1 and b.to_date = $2 and b.status in ('confirmed', 'checked_in', 'checked_out')`,
        [p.id, date],
        tx,
      );
      const arrivals = await this.db.query(
        `select b.id, b.room_id, r.name, b.guests, g.name as guest_name from booking b join room r on r.id = b.room_id
           left join guest g on g.id = b.guest_id
          where b.property_id = $1 and b.from_date = $2 and b.status = 'confirmed'`,
        [p.id, date],
        tx,
      );
      // OTA arrivals have no booking row: a reserved night today whose previous night is not reserved.
      const otaArrivals = await this.db.query(
        `select n.room_id, r.name, n.source from night_inventory n join room r on r.id = n.room_id
          where r.property_id = $1 and n.date = $2 and n.status = 'reserved' and n.booking_id is null
            and not exists (select 1 from night_inventory p2 where p2.room_id = n.room_id and p2.date = $2::date - 1
                              and p2.status = 'reserved' and p2.external_uid is not distinct from n.external_uid)`,
        [p.id, date],
        tx,
      );
      let created = 0;
      const add = async (roomId: string, bookingId: string | null, type: 'clean' | 'prepare', title: string) => {
        const r = await this.db.one(
          `insert into task (tenant_id, property_id, room_id, booking_id, date, type, title, source)
           values ($1, $2, $3, $4, $5, $6, $7, 'daily_board')
           on conflict (property_id, room_id, date, type) where source = 'daily_board' do nothing returning id`,
          [p.tenant_id, p.id, roomId, bookingId, date, type, title],
          tx,
        );
        if (r) created++;
      };
      for (const d of departures) await add(d.room_id, d.id, 'clean', `Clean ${d.name} after check-out`);
      for (const a of arrivals) await add(a.room_id, a.id, 'prepare', `Prepare ${a.name} for ${a.guest_name ?? 'guest'} (${a.guests} guests)`);
      for (const o of otaArrivals) await add(o.room_id, null, 'prepare', `Prepare ${o.name} (${o.source} arrival)`);
      const staff = await this.db.query(`select * from staff where property_id = $1 and active and role = 'cleaner' and phone is not null`, [p.id], tx);
      return { created, staff };
    });
    if (!result) return false;

    let notified = 0;
    if (result.created > 0) {
      const counts = await this.db.query<{ type: string; n: number }>(
        `select type, count(*)::int as n from task where property_id = $1 and date = $2 and status <> 'done' group by type`,
        [p.id, date],
      );
      const summary = counts.map((c) => `${c.n} to ${c.type}`).join(', ');
      for (const s of result.staff) {
        const r = await this.whatsapp.sendNamedTemplate(
          s.phone,
          'sd_cleaner_tasks',
          'en',
          { name: s.name, property: p.name, date, count: summary, link: `${this.staffBase()}/t/${s.access_token}` },
          p.whatsapp_phone_number_id,
        );
        if (r.ok) notified++;
      }
    }
    await this.db.query(`update task_board_run set tasks = $3, notified = $4 where property_id = $1 and date = $2`, [p.id, date, result.created, notified]);
    return true;
  }

  // ---------------------------------------------------------------- helpers
  private async patchTask(tx: pg.PoolClient, taskId: string, input: { status?: string; assigneeStaffId?: string | null; notes?: string; cost?: number | null; title?: string }) {
    const row = await this.db.one(
      `update task set status = coalesce($2, status),
              assignee_staff_id = case when $3::boolean then $4 else assignee_staff_id end,
              notes = coalesce($5, notes), cost = case when $6::boolean then $7 else cost end, title = coalesce($8, title),
              completed_at = case when coalesce($2, status) = 'done' then coalesce(completed_at, now()) else null end
        where id = $1 returning id`,
      [taskId, input.status ?? null, input.assigneeStaffId !== undefined, input.assigneeStaffId ?? null, input.notes ?? null, input.cost !== undefined, input.cost ?? null, input.title ?? null],
      tx,
    );
    if (!row) throw new NotFoundException('Task not found');
    return toTask((await this.db.one(`${TASK_SELECT} where t.id = $1`, [taskId], tx))!);
  }

  private async staffByToken(token: string): Promise<Row> {
    const s = /^[a-f0-9]{24,64}$/.test(token) ? await this.db.one(`select * from staff where access_token = $1 and active`, [token]) : null;
    if (!s) throw new NotFoundException('This link is no longer valid');
    return s;
  }

  private checkPhoto(file: { mimetype: string; size: number } | undefined) {
    if (!file) throw new BadRequestException('Attach a photo');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('Upload a JPG, PNG or WebP photo');
    if (file.size > 8 * 1024 * 1024) throw new BadRequestException('The photo is larger than 8 MB');
  }

  private async requireProperty(tx: pg.PoolClient, propertyId: string) {
    const p = await this.db.one(`select id from property where id = $1`, [propertyId], tx);
    if (!p) throw new NotFoundException('Property not found');
  }
}
