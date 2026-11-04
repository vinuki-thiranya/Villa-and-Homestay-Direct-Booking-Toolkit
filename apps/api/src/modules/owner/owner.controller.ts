import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  BlockSchema,
  CancelBookingSchema,
  DateRangeQuerySchema,
  GatewayConfigSchema,
  IcalSourceCreateSchema,
  PropertyPatchSchema,
  PropertyUpsertSchema,
  RatePlanUpsertSchema,
  RecordPaymentSchema,
  RefundSchema,
  ResolveConflictSchema,
  RoomPatchSchema,
  RoomUpsertSchema,
  type SessionUser,
} from '@staydirect/shared';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { IcalService } from '../ical/ical.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { PropertiesService } from '../properties/properties.service.js';

const Uuid = new ParseUUIDPipe({ version: '4' });
const ReasonSchema = z.object({ reason: z.string().min(3).max(300) });
const SlipReviewSchema = z.object({ approve: z.boolean(), amount: z.coerce.number().positive().optional() });
const CompleteRefundSchema = z.object({ reference: z.string().max(120).default('') });

/**
 * Owner and manager API (web dashboard and, later, the Flutter app). Every handler runs in the
 * caller's tenant via RLS; a property id from another tenant simply returns 404.
 */
@Controller()
@UseGuards(AuthGuard)
export class OwnerController {
  constructor(
    private readonly properties: PropertiesService,
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly dashboardSvc: DashboardService,
    private readonly ical: IcalService,
  ) {}

  // ---------------------------------------------------------------- properties
  @Get('properties')
  listProperties(@CurrentUser() u: SessionUser) {
    return this.properties.list(u);
  }

  @Post('properties')
  @Roles('owner')
  createProperty(@CurrentUser() u: SessionUser, @Body(new ZodPipe(PropertyUpsertSchema)) body: z.infer<typeof PropertyUpsertSchema>) {
    return this.properties.create(u, body);
  }

  @Get('properties/:id')
  getProperty(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.properties.get(u, id);
  }

  @Patch('properties/:id')
  updateProperty(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(PropertyPatchSchema)) body: z.infer<typeof PropertyPatchSchema>) {
    return this.properties.update(u, id, stripUndefined(body));
  }

  @Put('properties/:id/gateways')
  @Roles('owner')
  setGateways(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(GatewayConfigSchema)) body: z.infer<typeof GatewayConfigSchema>) {
    return this.properties.setGateways(u, id, body);
  }

  @Get('properties/:id/dashboard')
  dashboard(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.dashboardSvc.dashboard(u, id);
  }

  @Get('properties/:id/calendar')
  calendar(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query(new ZodPipe(DateRangeQuerySchema)) q: { from: string; to: string }) {
    return this.dashboardSvc.calendar(u, id, q.from, q.to);
  }

  // ---------------------------------------------------------------- rooms
  @Get('properties/:id/rooms')
  listRooms(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.properties.listRooms(u, id);
  }

  @Post('properties/:id/rooms')
  createRoom(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(RoomUpsertSchema)) body: z.infer<typeof RoomUpsertSchema>) {
    return this.properties.createRoom(u, id, body);
  }

  @Patch('rooms/:id')
  updateRoom(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(RoomPatchSchema)) body: z.infer<typeof RoomPatchSchema>) {
    return this.properties.updateRoom(u, id, stripUndefined(body));
  }

  @Post('rooms/:id/blocks')
  block(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(BlockSchema)) body: z.infer<typeof BlockSchema>) {
    return this.dashboardSvc.block(u, id, body);
  }

  @Post('rooms/:id/blocks/release')
  @HttpCode(200)
  unblock(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(BlockSchema)) body: z.infer<typeof BlockSchema>) {
    return this.dashboardSvc.unblock(u, id, body);
  }

  // ---------------------------------------------------------------- rate plans
  @Get('properties/:id/rate-plans')
  listRatePlans(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.properties.listRatePlans(u, id);
  }

  @Post('properties/:id/rate-plans')
  createRatePlan(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(RatePlanUpsertSchema)) body: z.infer<typeof RatePlanUpsertSchema>) {
    return this.properties.createRatePlan(u, id, body);
  }

  @Put('rate-plans/:id')
  updateRatePlan(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(RatePlanUpsertSchema)) body: z.infer<typeof RatePlanUpsertSchema>) {
    return this.properties.updateRatePlan(u, id, body);
  }

  @Delete('rate-plans/:id')
  deleteRatePlan(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.properties.deleteRatePlan(u, id);
  }

  // ---------------------------------------------------------------- iCal sync
  @Get('properties/:id/ical-sources')
  async icalSources(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    const [sources, rooms] = await Promise.all([this.properties.listIcalSources(u, id), this.properties.listRooms(u, id)]);
    return {
      exports: rooms.map((r) => ({ roomId: r.id, roomName: r.name, url: this.properties.exportUrl(r.icalExportToken) })),
      sources,
    };
  }

  @Post('rooms/:id/ical-sources')
  addIcalSource(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(IcalSourceCreateSchema)) body: z.infer<typeof IcalSourceCreateSchema>) {
    return this.properties.addIcalSource(u, id, body);
  }

  @Delete('ical-sources/:id')
  removeIcalSource(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.properties.removeIcalSource(u, id);
  }

  @Post('properties/:id/sync-now')
  @HttpCode(200)
  async syncNow(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    await this.properties.get(u, id); // tenant check before running system-context sync
    return this.ical.syncProperty(id);
  }

  @Get('properties/:id/sync-health')
  syncHealth(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.dashboardSvc.syncHealth(u, id);
  }

  @Get('properties/:id/conflicts')
  conflicts(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query('all') all?: string) {
    return this.dashboardSvc.conflicts(u, id, all !== '1');
  }

  @Post('conflicts/:id/resolve')
  @HttpCode(200)
  resolveConflict(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ResolveConflictSchema)) body: z.infer<typeof ResolveConflictSchema>) {
    return this.dashboardSvc.resolveConflict(u, id, body);
  }

  // ---------------------------------------------------------------- bookings
  @Get('properties/:id/bookings')
  listBookings(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query() q: { status?: string; from?: string; to?: string; search?: string }) {
    return this.bookings.list(u, id, q);
  }

  @Get('bookings/:id')
  booking(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.bookings.detail(u, id);
  }

  @Post('bookings/:id/approve')
  @HttpCode(200)
  approve(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.bookings.approve(u, id);
  }

  @Post('bookings/:id/decline')
  @HttpCode(200)
  decline(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ReasonSchema)) body: { reason: string }) {
    return this.bookings.decline(u, id, body.reason);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  async cancel(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(CancelBookingSchema)) body: z.infer<typeof CancelBookingSchema>) {
    const out = await this.bookings.cancel(u, id, body);
    const refund = out.refundDue > 0 ? await this.payments.refund(u, id, { amount: out.refundDue, reason: `Cancellation: ${body.reason}` }) : null;
    return { refundDue: out.refundDue, refund };
  }

  @Post('bookings/:id/no-show')
  @HttpCode(200)
  noShow(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.bookings.markNoShow(u, id);
  }

  @Post('bookings/:id/check-in')
  @HttpCode(200)
  checkIn(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.bookings.checkIn(u, id);
  }

  @Post('bookings/:id/check-out')
  @HttpCode(200)
  checkOut(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.bookings.checkOut(u, id);
  }

  // ---------------------------------------------------------------- payments
  @Post('bookings/:id/payments')
  recordPayment(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(RecordPaymentSchema)) body: z.infer<typeof RecordPaymentSchema>) {
    return this.payments.recordManual(u, id, body);
  }

  @Post('payments/:id/review')
  @HttpCode(200)
  reviewSlip(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SlipReviewSchema)) body: z.infer<typeof SlipReviewSchema>) {
    return this.payments.reviewSlip(u, id, body.approve, body.amount);
  }

  @Post('bookings/:id/refunds')
  refund(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(RefundSchema)) body: z.infer<typeof RefundSchema>) {
    return this.payments.refund(u, id, body);
  }

  @Post('payments/:id/complete-refund')
  @HttpCode(200)
  completeRefund(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(CompleteRefundSchema)) body: z.infer<typeof CompleteRefundSchema>) {
    return this.payments.completeRefund(u, id, body.reference);
  }
}

/** PATCH bodies: zod .partial() keeps defaults out, but drop undefined keys explicitly. */
function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
