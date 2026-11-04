import {
  Body,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AvailabilityQuerySchema,
  CreateBookingSchema,
  PaypalCaptureSchema,
  StartPaymentSchema,
  type AvailabilityQuery,
  type CreateBooking,
  type PublicProperty,
} from '@staydirect/shared';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { BrandingService } from '../branding/branding.service.js';
import { FxService } from '../fx/fx.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { CatalogService } from '../properties/catalog.service.js';
import { enabledMethods, toPublicRoom } from '../properties/mappers.js';

const SlipSchema = z.object({ token: z.string().min(16), method: z.enum(['bank', 'lankaqr']) });

/** Endpoints for the guest booking site. Only explicit public projections leave this controller. */
@Controller('public')
export class PublicController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly availability: AvailabilityService,
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly fx: FxService,
    private readonly branding: BrandingService,
  ) {}

  @Get('sites/:site')
  @Header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
  async site(@Param('site') site: string): Promise<PublicProperty> {
    const p = await this.catalog.propertyBySite(site);
    if (!p) throw new NotFoundException('Property not found');
    const bundle = (await this.catalog.bundle(p.id))!;
    const cfg = this.catalog.gatewayConfig(p);
    const brand = await this.branding.forTenant(p.tenant_id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      type: p.type,
      description: p.description,
      address: p.address,
      area: p.area,
      lat: p.lat,
      lng: p.lng,
      sltdaNumber: p.sltda_number,
      checkIn: p.check_in,
      checkOut: p.check_out,
      timezone: p.timezone,
      whatsappNumber: p.whatsapp_number,
      email: p.email,
      baseCurrency: p.base_currency,
      houseRules: p.house_rules,
      defaultCancellationPolicy: p.default_cancellation_policy,
      defaultDepositPct: p.default_deposit_pct,
      theme: p.theme,
      photos: p.photos,
      customDomain: p.custom_domain,
      hostName: p.host_name,
      hostPhotoUrl: p.host_photo_url,
      paymentMethods: enabledMethods(cfg),
      paypalClientId: cfg?.paypal?.clientId ?? null,
      rooms: bundle.rooms.map((r) => toPublicRoom(r, p)),
      fx: await this.fx.table(),
      bookingDisabled: !this.catalog.bookingEnabled(bundle.tenant),
      whiteLabel: brand.whiteLabel,
      brand: brand.whiteLabel
        ? { displayName: brand.displayName, logoUrl: brand.logoUrl, primaryColor: brand.primaryColor, accentColor: brand.accentColor }
        : null,
      themeTokens: await this.branding.themeTokens(p.theme),
    };
  }

  @Get('sites/:site/availability')
  @Header('cache-control', 'no-store')
  async search(@Param('site') site: string, @Query(new ZodPipe(AvailabilityQuerySchema)) q: AvailabilityQuery) {
    const p = await this.catalog.propertyBySite(site);
    if (!p) throw new NotFoundException('Property not found');
    const promo = q.code ? await this.bookings.validateDiscount(p.id, q.code) : null;
    const result = await this.availability.search((await this.catalog.bundle(p.id))!, q, promo?.pct ?? 0);
    return { ...result, promo: promo ? { code: promo.code, pct: promo.pct } : null };
  }

  @Post('bookings')
  create(@Body(new ZodPipe(CreateBookingSchema)) body: CreateBooking) {
    return this.bookings.create(body);
  }

  @Get('bookings/:reference')
  @Header('cache-control', 'no-store')
  get(@Param('reference') reference: string, @Query('t') token: string) {
    return this.bookings.getPublic(reference, token ?? '');
  }

  @Post('bookings/:reference/payments')
  startPayment(@Param('reference') reference: string, @Body(new ZodPipe(StartPaymentSchema)) body: z.infer<typeof StartPaymentSchema>) {
    return this.payments.start(reference, body.token, body.method);
  }

  @Post('bookings/:reference/paypal/capture')
  capture(@Param('reference') reference: string, @Body(new ZodPipe(PaypalCaptureSchema)) body: z.infer<typeof PaypalCaptureSchema>) {
    return this.payments.capturePaypal(reference, body.token, body.orderId);
  }

  @Post('bookings/:reference/slip')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  slip(
    @Param('reference') reference: string,
    @Body(new ZodPipe(SlipSchema)) body: z.infer<typeof SlipSchema>,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.payments.uploadSlip(reference, body.token, body.method, file);
  }
}
