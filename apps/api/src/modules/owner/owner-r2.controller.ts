import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AddOnOrderStatusSchema,
  AddOnPatchSchema,
  AddOnSchema,
  ConciergeSettingsSchema,
  ConversationUpdateSchema,
  DateRangeQuerySchema,
  DiscountCodeSchema,
  GuestNotesSchema,
  KnowledgeEntrySchema,
  OwnerAddOnOrderSchema,
  ProviderPatchSchema,
  ProviderSchema,
  QuickReplySchema,
  ReviewReplySchema,
  SendMessageSchema,
  SequenceUpdateSchema,
  StaffPatchSchema,
  StaffSchema,
  TaskCreateSchema,
  TaskPatchSchema,
  type SessionUser,
} from '@staydirect/shared';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AddOnsService } from '../addons/addons.service.js';
import { GuestsService } from '../guests/guests.service.js';
import { InboxService } from '../inbox/inbox.service.js';
import { SetupService } from '../inbox/setup.service.js';
import { OpsService } from '../ops/ops.service.js';

const Uuid = new ParseUUIDPipe({ version: '4' });
const MonthSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });
const OptionalRangeSchema = z.object({ from: z.string().optional(), to: z.string().optional() });
type Body<T extends z.ZodType> = z.infer<T>;

/** Release 2 owner/manager API: inbox, concierge setup, housekeeping, add-ons, reviews, CRM. */
@Controller()
@UseGuards(AuthGuard)
export class OwnerR2Controller {
  constructor(
    private readonly inbox: InboxService,
    private readonly setup: SetupService,
    private readonly ops: OpsService,
    private readonly addOns: AddOnsService,
    private readonly guests: GuestsService,
  ) {}

  // ---------------------------------------------------------------- inbox
  @Get('properties/:id/conversations')
  conversations(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query('status') status?: string) {
    return this.inbox.listConversations(u, id, status);
  }

  @Get('conversations/:id')
  thread(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.inbox.thread(u, id);
  }

  @Post('conversations/:id/messages')
  send(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SendMessageSchema)) b: Body<typeof SendMessageSchema>) {
    return this.inbox.ownerSend(u, id, b.body);
  }

  @Patch('conversations/:id')
  updateConversation(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ConversationUpdateSchema)) b: Body<typeof ConversationUpdateSchema>) {
    return this.inbox.updateConversation(u, id, b);
  }

  // ---------------------------------------------------------------- concierge & guide
  @Get('properties/:id/concierge')
  concierge(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.setup.getSettings(u, id);
  }

  @Put('properties/:id/concierge')
  @Roles('owner')
  updateConcierge(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ConciergeSettingsSchema)) b: Body<typeof ConciergeSettingsSchema>) {
    return this.setup.updateSettings(u, id, b);
  }

  @Get('properties/:id/quick-replies')
  quickReplies(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query('language') language?: string) {
    return this.setup.listQuickReplies(u, id, language);
  }

  @Post('properties/:id/quick-replies')
  upsertQuickReply(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(QuickReplySchema)) b: Body<typeof QuickReplySchema>) {
    return this.setup.upsertQuickReply(u, id, b);
  }

  @Post('properties/:id/quick-replies/load-defaults')
  @HttpCode(200)
  loadQuickReplies(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.setup.loadDefaultQuickReplies(u, id);
  }

  @Delete('quick-replies/:id')
  deleteQuickReply(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.setup.deleteQuickReply(u, id);
  }

  @Get('properties/:id/knowledge')
  knowledge(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.setup.listKnowledge(u, id);
  }

  @Post('properties/:id/knowledge')
  createKnowledge(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(KnowledgeEntrySchema)) b: Body<typeof KnowledgeEntrySchema>) {
    return this.setup.createKnowledge(u, id, b);
  }

  @Put('knowledge/:id')
  updateKnowledge(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(KnowledgeEntrySchema)) b: Body<typeof KnowledgeEntrySchema>) {
    return this.setup.updateKnowledge(u, id, b);
  }

  @Delete('knowledge/:id')
  deleteKnowledge(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.setup.deleteKnowledge(u, id);
  }

  @Get('properties/:id/sequences')
  sequences(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.setup.listSequences(u, id);
  }

  @Put('properties/:id/sequences')
  updateSequence(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SequenceUpdateSchema)) b: Body<typeof SequenceUpdateSchema>) {
    return this.setup.updateSequence(u, id, b);
  }

  // ---------------------------------------------------------------- housekeeping
  @Get('properties/:id/staff')
  staff(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.ops.listStaff(u, id);
  }

  @Post('properties/:id/staff')
  createStaff(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(StaffSchema)) b: Body<typeof StaffSchema>) {
    return this.ops.createStaff(u, id, b);
  }

  @Patch('staff/:id')
  updateStaff(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(StaffPatchSchema)) b: Body<typeof StaffPatchSchema>) {
    return this.ops.updateStaff(u, id, b as any);
  }

  @Get('properties/:id/tasks')
  tasks(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query(new ZodPipe(DateRangeQuerySchema)) q: { from: string; to: string }) {
    return this.ops.listTasks(u, id, q.from, q.to);
  }

  @Post('properties/:id/tasks')
  createTask(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(TaskCreateSchema)) b: Body<typeof TaskCreateSchema>) {
    return this.ops.createTask(u, id, b);
  }

  /** Build today's board now (normally the 6 am job does it). */
  @Post('properties/:id/tasks/build-board')
  @HttpCode(200)
  buildBoard(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.ops.buildBoardNow(u, id);
  }

  @Patch('tasks/:id')
  updateTask(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(TaskPatchSchema)) b: Body<typeof TaskPatchSchema>) {
    return this.ops.updateTask(u, id, b);
  }

  @Post('tasks/:id/photos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  taskPhoto(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @UploadedFile() file: Express.Multer.File) {
    return this.ops.addTaskPhoto(u, id, file);
  }

  // ---------------------------------------------------------------- add-ons
  @Get('providers')
  providers(@CurrentUser() u: SessionUser) {
    return this.addOns.listProviders(u);
  }

  @Post('providers')
  createProvider(@CurrentUser() u: SessionUser, @Body(new ZodPipe(ProviderSchema)) b: Body<typeof ProviderSchema>) {
    return this.addOns.createProvider(u, b);
  }

  @Patch('providers/:id')
  updateProvider(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ProviderPatchSchema)) b: Body<typeof ProviderPatchSchema>) {
    return this.addOns.updateProvider(u, id, b as any);
  }

  @Get('properties/:id/add-ons')
  listAddOns(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.addOns.listAddOns(u, id);
  }

  @Post('properties/:id/add-ons')
  createAddOn(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(AddOnSchema)) b: Body<typeof AddOnSchema>) {
    return this.addOns.createAddOn(u, id, b);
  }

  @Patch('add-ons/:id')
  updateAddOn(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(AddOnPatchSchema)) b: Body<typeof AddOnPatchSchema>) {
    return this.addOns.updateAddOn(u, id, b);
  }

  @Get('properties/:id/add-on-orders')
  orders(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query(new ZodPipe(OptionalRangeSchema)) q: Body<typeof OptionalRangeSchema>) {
    return this.addOns.listOrders(u, id, q.from, q.to);
  }

  @Get('bookings/:id/add-on-orders')
  bookingOrders(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.addOns.listBookingOrders(u, id);
  }

  @Post('bookings/:id/add-ons')
  orderForGuest(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(OwnerAddOnOrderSchema)) b: Body<typeof OwnerAddOnOrderSchema>) {
    return this.addOns.ownerOrder(u, id, b);
  }

  @Post('add-on-orders/:id/status')
  @HttpCode(200)
  orderStatus(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(AddOnOrderStatusSchema)) b: Body<typeof AddOnOrderStatusSchema>) {
    return this.addOns.setOrderStatus(u, id, b.status);
  }

  @Post('add-on-orders/:id/resend')
  @HttpCode(200)
  resendJobCard(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.addOns.resendJobCard(u, id);
  }

  @Get('properties/:id/add-on-commissions')
  commissions(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query(new ZodPipe(MonthSchema)) q: Body<typeof MonthSchema>) {
    return this.addOns.commissions(u, id, q.month);
  }

  // ---------------------------------------------------------------- reviews & CRM
  @Get('properties/:id/reviews')
  reviews(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.guests.listReviews(u, id);
  }

  @Post('reviews/:id/reply')
  @HttpCode(200)
  replyReview(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(ReviewReplySchema)) b: Body<typeof ReviewReplySchema>) {
    return this.guests.replyReview(u, id, b);
  }

  @Get('properties/:id/guests')
  listGuests(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Query('search') search?: string) {
    return this.guests.listGuests(u, id, search);
  }

  @Get('guests/:id')
  guest(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.guests.guestDetail(u, id);
  }

  @Patch('guests/:id')
  guestNotes(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(GuestNotesSchema)) b: Body<typeof GuestNotesSchema>) {
    return this.guests.updateGuestNotes(u, id, b.notes);
  }

  @Get('properties/:id/discount-codes')
  codes(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.guests.listCodes(u, id);
  }

  @Post('properties/:id/discount-codes')
  createCode(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(DiscountCodeSchema)) b: Body<typeof DiscountCodeSchema>) {
    return this.guests.createCode(u, id, b);
  }

  @Post('discount-codes/:id/deactivate')
  @HttpCode(200)
  deactivateCode(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.guests.deactivateCode(u, id);
  }
}
