import { Body, Controller, Get, Header, NotFoundException, Param, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GuestAddOnOrderSchema, JobCardActionSchema, ReviewSubmitSchema, StaffTaskActionSchema } from '@staydirect/shared';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AddOnsService } from '../addons/addons.service.js';
import { GuestsService } from '../guests/guests.service.js';
import { SetupService } from '../inbox/setup.service.js';
import { OpsService } from '../ops/ops.service.js';
import { CatalogService } from '../properties/catalog.service.js';

type Body<T extends z.ZodType> = z.infer<T>;

/** Release 2 public endpoints: guest site extras and the no-login staff/provider links. */
@Controller('public')
export class PublicR2Controller {
  constructor(
    private readonly catalog: CatalogService,
    private readonly addOns: AddOnsService,
    private readonly guests: GuestsService,
    private readonly setup: SetupService,
    private readonly ops: OpsService,
  ) {}

  private async property(site: string) {
    const p = await this.catalog.propertyBySite(site);
    if (!p) throw new NotFoundException('Property not found');
    return p;
  }

  // ---------------------------------------------------------------- guest site
  @Get('sites/:site/add-ons')
  @Header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
  async siteAddOns(@Param('site') site: string) {
    return this.addOns.publicCatalogue((await this.property(site)).id);
  }

  @Get('sites/:site/reviews')
  @Header('cache-control', 'public, max-age=300, stale-while-revalidate=3600')
  async siteReviews(@Param('site') site: string) {
    return this.guests.publicReviews((await this.property(site)).id);
  }

  @Get('sites/:site/discount-codes/:code')
  @Header('cache-control', 'no-store')
  validateCode(@Param('site') site: string, @Param('code') code: string) {
    return this.guests.publicValidateCode(site, code);
  }

  @Get('guide/:token')
  @Header('cache-control', 'private, no-store')
  guide(@Param('token') token: string) {
    return this.setup.publicGuide(token);
  }

  @Get('bookings/:reference/add-ons')
  @Header('cache-control', 'no-store')
  bookingAddOns(@Param('reference') reference: string, @Query('t') token: string) {
    return this.addOns.guestAddOns(reference, token ?? '');
  }

  @Post('bookings/:reference/add-ons')
  orderAddOn(@Param('reference') reference: string, @Body(new ZodPipe(GuestAddOnOrderSchema)) b: Body<typeof GuestAddOnOrderSchema>) {
    return this.addOns.guestOrder(reference, b);
  }

  @Get('reviews/:reference')
  @Header('cache-control', 'no-store')
  reviewContext(@Param('reference') reference: string, @Query('t') token: string) {
    return this.guests.reviewContext(reference, token ?? '');
  }

  @Post('reviews/:reference')
  submitReview(@Param('reference') reference: string, @Body(new ZodPipe(ReviewSubmitSchema)) b: Body<typeof ReviewSubmitSchema>) {
    return this.guests.submitReview(reference, b);
  }

  // ---------------------------------------------------------------- cleaner list (WhatsApp link, no login)
  @Get('staff/:token/tasks')
  @Header('cache-control', 'no-store')
  staffTasks(@Param('token') token: string, @Query('date') date?: string) {
    return this.ops.staffTasks(token, date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined);
  }

  @Post('staff/:token/tasks/:taskId')
  staffTask(@Param('token') token: string, @Param('taskId') taskId: string, @Body(new ZodPipe(StaffTaskActionSchema)) b: Body<typeof StaffTaskActionSchema>) {
    return this.ops.staffUpdateTask(token, taskId, b);
  }

  @Post('staff/:token/tasks/:taskId/photos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  staffPhoto(@Param('token') token: string, @Param('taskId') taskId: string, @UploadedFile() file: Express.Multer.File) {
    return this.ops.staffAddPhoto(token, taskId, file);
  }

  // ---------------------------------------------------------------- provider job card (WhatsApp link, no login)
  @Get('jobs/:token')
  @Header('cache-control', 'no-store')
  job(@Param('token') token: string) {
    return this.addOns.jobCard(token);
  }

  @Post('jobs/:token')
  jobAction(@Param('token') token: string, @Body(new ZodPipe(JobCardActionSchema)) b: Body<typeof JobCardActionSchema>) {
    return this.addOns.jobAction(token, b.action);
  }
}
