import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  AdminTenantPatchSchema,
  BillingRunSchema,
  FlagDefinitionSchema,
  FlagKeySchema,
  FlagOverrideSchema,
  HolidayRangeSchema,
  HolidaySchema,
  LANGUAGES,
  LedgerPaidSchema,
  ThemeSchema,
  TicketMessageSchema,
  TicketStatusSchema,
  TranslationSchema,
} from '@staydirect/shared';
import { z } from 'zod';
import { AdminGuard, CurrentAdmin, type AdminSession } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { BillingService } from '../billing/billing.service.js';
import { BrandingService } from '../branding/branding.service.js';
import { HolidaysService } from '../holidays/holidays.service.js';
import { AdminService } from './admin.service.js';
import { SupportService } from './support.service.js';

const Uuid = new ParseUUIDPipe({ version: '4' });
type B<T extends z.ZodType> = z.infer<T>;
const KeyPipe = new ZodPipe(FlagKeySchema);
const LangPipe = new ZodPipe(z.enum(LANGUAGES));

/** StayDirect admin console API (spec §3.11). AdminGuard: platform admin tokens only. */
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly billing: BillingService,
    private readonly branding: BrandingService,
    private readonly support: SupportService,
    private readonly holidays: HolidaysService,
  ) {}

  @Get('me')
  me(@CurrentAdmin() a: AdminSession) {
    return a;
  }

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  // ---------------------------------------------------------------- tenants
  @Get('tenants')
  tenants(@Query('search') search?: string) {
    return this.admin.tenants(search || undefined);
  }

  @Get('tenants/:id')
  tenant(@Param('id', Uuid) id: string) {
    return this.admin.tenant(id);
  }

  @Patch('tenants/:id')
  updateTenant(@Param('id', Uuid) id: string, @Body(new ZodPipe(AdminTenantPatchSchema)) b: B<typeof AdminTenantPatchSchema>) {
    return this.admin.updateTenant(id, b);
  }

  // ---------------------------------------------------------------- feature flags
  @Get('flags')
  flags() {
    return this.admin.flagDefinitions();
  }

  @Put('flags/:key')
  updateFlag(@Param('key', KeyPipe) key: B<typeof FlagKeySchema>, @Body(new ZodPipe(FlagDefinitionSchema)) b: B<typeof FlagDefinitionSchema>) {
    return this.admin.updateFlag(key, b);
  }

  @Put('tenants/:id/flags/:key')
  setOverride(
    @CurrentAdmin() a: AdminSession,
    @Param('id', Uuid) id: string,
    @Param('key', KeyPipe) key: B<typeof FlagKeySchema>,
    @Body(new ZodPipe(FlagOverrideSchema)) b: B<typeof FlagOverrideSchema>,
  ) {
    return this.admin.setOverride(id, key, b.enabled, a.name);
  }

  // ---------------------------------------------------------------- billing / commission ledger
  @Get('ledger')
  ledger(@Query('status') status?: string) {
    return this.billing.adminLedger(status || undefined);
  }

  @Post('ledger/:id/paid')
  @HttpCode(200)
  markPaid(@CurrentAdmin() a: AdminSession, @Param('id', Uuid) id: string, @Body(new ZodPipe(LedgerPaidSchema)) b: B<typeof LedgerPaidSchema>) {
    return this.billing.settle(id, 'paid', b.note, a.name);
  }

  @Post('ledger/:id/void')
  @HttpCode(200)
  voidEntry(@CurrentAdmin() a: AdminSession, @Param('id', Uuid) id: string, @Body(new ZodPipe(LedgerPaidSchema)) b: B<typeof LedgerPaidSchema>) {
    return this.billing.settle(id, 'void', b.note, a.name);
  }

  @Post('billing/run')
  @HttpCode(200)
  async runBilling(@Body(new ZodPipe(BillingRunSchema)) b: B<typeof BillingRunSchema>) {
    return { created: await this.billing.runPeriod(b.period) };
  }

  // ---------------------------------------------------------------- holidays (Poya days, gazette changes)
  @Get('holidays')
  listHolidays(@Query(new ZodPipe(HolidayRangeSchema)) q: B<typeof HolidayRangeSchema>) {
    return this.holidays.list(q.from, q.to);
  }

  @Put('holidays')
  upsertHoliday(@CurrentAdmin() a: AdminSession, @Body(new ZodPipe(HolidaySchema)) b: B<typeof HolidaySchema>) {
    return this.holidays.upsert(a.name, b);
  }

  @Delete('holidays/:date/:nameEn')
  deleteHoliday(@Param('date') date: string, @Param('nameEn') nameEn: string) {
    return this.holidays.remove(date, nameEn);
  }

  // ---------------------------------------------------------------- themes & translations
  @Get('themes')
  themes() {
    return this.branding.listThemes();
  }

  @Put('themes/:key')
  upsertTheme(@CurrentAdmin() a: AdminSession, @Param('key') key: string, @Body(new ZodPipe(ThemeSchema)) b: B<typeof ThemeSchema>) {
    return this.branding.upsertTheme(a.name, { ...b, key });
  }

  @Get('translations')
  translations() {
    return this.branding.listTranslations();
  }

  @Put('translations')
  setTranslation(@CurrentAdmin() a: AdminSession, @Body(new ZodPipe(TranslationSchema)) b: B<typeof TranslationSchema>) {
    return this.branding.setTranslation(a.name, b);
  }

  @Delete('translations/:lang/:key')
  deleteTranslation(@Param('lang', LangPipe) lang: string, @Param('key') key: string) {
    return this.branding.deleteTranslation(lang, key);
  }

  // ---------------------------------------------------------------- support tickets
  @Get('tickets')
  tickets(@Query('status') status?: string) {
    return this.support.adminList(status || undefined);
  }

  @Get('tickets/:id')
  ticket(@Param('id', Uuid) id: string) {
    return this.support.adminThread(id);
  }

  @Post('tickets/:id/messages')
  reply(@CurrentAdmin() a: AdminSession, @Param('id', Uuid) id: string, @Body(new ZodPipe(TicketMessageSchema)) b: B<typeof TicketMessageSchema>) {
    return this.support.adminReply(id, a.name, b.body);
  }

  @Patch('tickets/:id')
  ticketStatus(@Param('id', Uuid) id: string, @Body(new ZodPipe(TicketStatusSchema)) b: B<typeof TicketStatusSchema>) {
    return this.support.adminSetStatus(id, b.status);
  }
}
