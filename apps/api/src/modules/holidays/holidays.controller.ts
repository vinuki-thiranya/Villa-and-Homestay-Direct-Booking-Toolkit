import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { HolidayRangeSchema } from '@staydirect/shared';
import { z } from 'zod';
import { AuthGuard, Roles } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { HolidaysService } from './holidays.service.js';

/** Holidays for owner calendars (any signed-in team member). Admins edit them under /admin/holidays. */
@Controller('holidays')
@UseGuards(AuthGuard)
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  @Roles('owner', 'manager', 'staff')
  @Header('cache-control', 'private, max-age=3600')
  list(@Query(new ZodPipe(HolidayRangeSchema)) q: z.infer<typeof HolidayRangeSchema>) {
    return this.holidays.list(q.from, q.to);
  }
}
