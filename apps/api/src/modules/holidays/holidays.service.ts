import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { diffDays, type Holiday } from '@staydirect/shared';
import { DbService, type Row } from '../../common/db.service.js';

const MAX_RANGE_DAYS = 800;

function toHoliday(r: Row): Holiday {
  return { date: r.date, nameEn: r.name_en, nameSi: r.name_si, isPoya: r.is_poya, types: r.types };
}

/**
 * Sri Lanka's public, bank and mercantile holidays, Poya days marked (owner calendars, Today).
 * Platform reference data: seeded from the gazette in 0005, corrected by StayDirect admins.
 */
@Injectable()
export class HolidaysService {
  constructor(private readonly db: DbService) {}

  async list(from: string, to: string): Promise<Holiday[]> {
    if (to < from) throw new BadRequestException('to must not be before from');
    if (diffDays(from, to) > MAX_RANGE_DAYS) throw new BadRequestException(`At most ${MAX_RANGE_DAYS} days`);
    const rows = await this.db.query(`select * from public_holiday where date between $1 and $2 order by date, is_poya desc, name_en`, [from, to]);
    return rows.map(toHoliday);
  }

  async upsert(admin: string, h: Holiday): Promise<Holiday> {
    const r = await this.db.one(
      `insert into public_holiday (date, name_en, name_si, is_poya, types, updated_by) values ($1, $2, $3, $4, $5, $6)
       on conflict (date, name_en) do update set name_si = excluded.name_si, is_poya = excluded.is_poya, types = excluded.types,
         updated_by = excluded.updated_by, updated_at = now()
       returning *`,
      [h.date, h.nameEn, h.nameSi, h.isPoya, h.types, admin],
    );
    return toHoliday(r!);
  }

  async remove(date: string, nameEn: string) {
    const r = await this.db.one(`delete from public_holiday where date = $1 and name_en = $2 returning date`, [date, nameEn]);
    if (!r) throw new NotFoundException('Holiday not found');
    return { ok: true };
  }
}
