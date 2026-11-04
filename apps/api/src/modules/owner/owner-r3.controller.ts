import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, StreamableFile, UseGuards } from '@nestjs/common';
import {
  AssignOwnerSchema,
  BrandSchema,
  ChannelConnectSchema,
  DateRangeQuerySchema,
  GuestIdentitySchema,
  InviteSchema,
  IssueInvoiceSchema,
  PLAN_PRICING,
  PropertyOwnerPatchSchema,
  PropertyOwnerSchema,
  SimReservationSchema,
  StatementQuerySchema,
  TicketCreateSchema,
  TicketMessageSchema,
  UserAccessSchema,
  UtilityReadingSchema,
  period,
  type SessionUser,
} from '@staydirect/shared';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AddOnsService } from '../addons/addons.service.js';
import { SupportService } from '../admin/support.service.js';
import { BillingService } from '../billing/billing.service.js';
import { BrandingService } from '../branding/branding.service.js';
import { ChannelsService } from '../channels/channels.service.js';
import { PortfolioService } from '../dashboard/portfolio.service.js';
import { FlagsService } from '../flags/flags.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import { StatementsService } from '../statements/statements.service.js';
import { TeamService } from '../team/team.service.js';

const Uuid = new ParseUUIDPipe({ version: '4' });
type B<T extends z.ZodType> = z.infer<T>;
const CalendarQuery = DateRangeQuerySchema.and(z.object({ propertyIds: z.string().optional() }));
const FinalizeSchema = z.object({ period, reissue: z.boolean().default(false) });
const ChannelStatusSchema = z.object({ status: z.enum(['active', 'paused']) });

/** Release 3 owner/manager API: portfolio, team, owners & statements, invoices, OTA connection, billing, support. */
@Controller()
@UseGuards(AuthGuard)
export class OwnerR3Controller {
  constructor(
    private readonly portfolio: PortfolioService,
    private readonly team: TeamService,
    private readonly statements: StatementsService,
    private readonly invoices: InvoicesService,
    private readonly branding: BrandingService,
    private readonly channels: ChannelsService,
    private readonly addOns: AddOnsService,
    private readonly billing: BillingService,
    private readonly support: SupportService,
    private readonly flags: FlagsService,
  ) {}

  // ---------------------------------------------------------------- multi-property
  @Get('portfolio')
  portfolioSummary(@CurrentUser() u: SessionUser) {
    return this.portfolio.portfolio(u);
  }

  @Get('calendar')
  allCalendar(@CurrentUser() u: SessionUser, @Query(new ZodPipe(CalendarQuery)) q: { from: string; to: string; propertyIds?: string }) {
    return this.portfolio.calendar(u, q.from, q.to, q.propertyIds?.split(',').filter(Boolean));
  }

  // ---------------------------------------------------------------- team
  @Get('team')
  teamList(@CurrentUser() u: SessionUser) {
    return this.team.list(u);
  }

  @Post('team/invites')
  @Roles('owner')
  invite(@CurrentUser() u: SessionUser, @Body(new ZodPipe(InviteSchema)) b: B<typeof InviteSchema>) {
    return this.team.invite(u, b);
  }

  @Delete('team/invites/:id')
  @Roles('owner')
  revokeInvite(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.team.revokeInvite(u, id);
  }

  @Patch('team/members/:id')
  @Roles('owner')
  updateMember(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(UserAccessSchema)) b: B<typeof UserAccessSchema>) {
    return this.team.updateMember(u, id, b);
  }

  @Delete('team/members/:id')
  @Roles('owner')
  removeMember(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.team.removeMember(u, id);
  }

  // ---------------------------------------------------------------- property owners & statements (Manager plan)
  @Get('owners')
  owners(@CurrentUser() u: SessionUser) {
    return this.statements.listOwners(u);
  }

  @Post('owners')
  createOwner(@CurrentUser() u: SessionUser, @Body(new ZodPipe(PropertyOwnerSchema)) b: B<typeof PropertyOwnerSchema>) {
    return this.statements.createOwner(u, b);
  }

  @Patch('owners/:id')
  updateOwner(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(PropertyOwnerPatchSchema)) b: B<typeof PropertyOwnerPatchSchema>) {
    return this.statements.updateOwner(u, id, b);
  }

  @Get('owners/:id/payout-details')
  @Roles('owner')
  payoutDetails(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.statements.payoutDetails(u, id);
  }

  @Put('properties/:id/owner')
  assignOwner(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(AssignOwnerSchema)) b: B<typeof AssignOwnerSchema>) {
    return this.statements.assignProperty(u, id, b.ownerId);
  }

  @Get('owners/:id/statement')
  previewStatement(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query(new ZodPipe(StatementQuerySchema)) q: { period: string }) {
    return this.statements.preview(u, id, q.period);
  }

  @Get('owners/:id/statement.xlsx')
  @Header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async statementXlsx(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query(new ZodPipe(StatementQuerySchema)) q: { period: string }) {
    return new StreamableFile(await this.statements.excel(u, id, q.period), { disposition: `attachment; filename="statement-${q.period}.xlsx"` });
  }

  @Post('owners/:id/statements')
  finalizeStatement(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(FinalizeSchema)) b: B<typeof FinalizeSchema>) {
    return this.statements.finalize(u, id, b.period, b.reissue);
  }

  @Get('statements')
  listStatements(@CurrentUser() u: SessionUser, @Query('ownerId') ownerId?: string) {
    return this.statements.listStatements(u, ownerId || undefined);
  }

  // ---------------------------------------------------------------- white label
  @Get('brand')
  brand(@CurrentUser() u: SessionUser) {
    return this.branding.forTenant(u.tenantId);
  }

  @Put('brand')
  @Roles('owner')
  setBrand(@CurrentUser() u: SessionUser, @Body(new ZodPipe(BrandSchema)) b: B<typeof BrandSchema>) {
    return this.branding.updateBrand(u, b);
  }

  // ---------------------------------------------------------------- invoices & long stays
  @Get('bookings/:id/invoices')
  bookingInvoices(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.invoices.listForBooking(u, id);
  }

  @Post('bookings/:id/invoices')
  issueInvoice(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(IssueInvoiceSchema)) b: B<typeof IssueInvoiceSchema>) {
    return this.invoices.issueForBooking(u, id, b);
  }

  @Get('bookings/:id/utility-readings')
  readings(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.invoices.listReadings(u, id);
  }

  @Post('bookings/:id/utility-readings')
  addReading(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(UtilityReadingSchema)) b: B<typeof UtilityReadingSchema>) {
    return this.invoices.addReading(u, id, b);
  }

  @Delete('utility-readings/:id')
  deleteReading(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.invoices.deleteReading(u, id);
  }

  @Put('guests/:id/identity')
  guestIdentity(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(GuestIdentitySchema)) b: B<typeof GuestIdentitySchema>) {
    return this.invoices.setPassportLast4(u, id, b.passportLast4);
  }

  // ---------------------------------------------------------------- OTA direct connection
  @Get('properties/:id/channel')
  channelStatus(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.channels.status(u, id);
  }

  @Post('properties/:id/channel')
  @Roles('owner')
  connectChannel(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ChannelConnectSchema)) b: B<typeof ChannelConnectSchema>) {
    return this.channels.connect(u, id, b);
  }

  @Post('properties/:id/channel/status')
  @HttpCode(200)
  channelSetStatus(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ChannelStatusSchema)) b: B<typeof ChannelStatusSchema>) {
    return this.channels.setStatus(u, id, b.status);
  }

  @Post('properties/:id/channel/sync')
  @HttpCode(200)
  async channelSync(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    const conn = await this.channels.status(u, id); // tenant/property access check
    if (!conn) return { pushed: 0, imported: 0 };
    return { pushed: await this.channels.pushProperty(id), imported: await this.channels.pullProperty(id) };
  }

  @Get('properties/:id/channel/simulator')
  simulatorState(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query(new ZodPipe(DateRangeQuerySchema)) q: { from: string; to: string }) {
    return this.channels.simulatorState(u, id, q.from, q.to);
  }

  /** Dev/demo only: an OTA guest books through the simulated channel. */
  @Post('properties/:id/channel/simulator/reservations')
  simulateReservation(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SimReservationSchema)) b: B<typeof SimReservationSchema>, @Query('lag') lag?: string) {
    return this.channels.simulateReservation(u, id, b, { simulateLag: lag === '1' });
  }

  @Post('providers/:id/reinstate')
  @HttpCode(200)
  reinstateProvider(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.addOns.reinstateProvider(u, id);
  }

  // ---------------------------------------------------------------- billing (what the owner owes StayDirect)
  @Get('billing')
  async billingOverview(@CurrentUser() u: SessionUser) {
    const [ledger, flags] = await Promise.all([this.billing.ownerLedger(u), this.flags.forTenant(u.tenantId)]);
    return { ledger, flags, pricing: PLAN_PRICING };
  }

  // ---------------------------------------------------------------- support
  @Get('support/tickets')
  tickets(@CurrentUser() u: SessionUser) {
    return this.support.ownerList(u);
  }

  @Post('support/tickets')
  createTicket(@CurrentUser() u: SessionUser, @Body(new ZodPipe(TicketCreateSchema)) b: B<typeof TicketCreateSchema>) {
    return this.support.ownerCreate(u, b);
  }

  @Get('support/tickets/:id')
  ticket(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.support.ownerThread(u, id);
  }

  @Post('support/tickets/:id/messages')
  replyTicket(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(TicketMessageSchema)) b: B<typeof TicketMessageSchema>) {
    return this.support.ownerReply(u, id, b.body);
  }
}
