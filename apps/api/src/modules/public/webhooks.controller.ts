import { Body, Controller, ForbiddenException, Get, Header, Headers, HttpCode, Inject, NotFoundException, Param, Post, Query, Req, Res, type RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DbService } from '../../common/db.service.js';
import { CONFIG, type AppConfig } from '../../config.js';
import { InboxService } from '../inbox/inbox.service.js';
import { IcalService } from '../ical/ical.service.js';
import type { PayhereNotify } from '../payments/payhere.js';
import { PaymentsService } from '../payments/payments.service.js';

@Controller()
export class WebhooksController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly ical: IcalService,
    private readonly inbox: InboxService,
    @Inject(CONFIG) private readonly config: AppConfig,
    private readonly db: DbService,
  ) {}

  /** Meta webhook subscription handshake. */
  @Get('webhooks/whatsapp')
  @Header('content-type', 'text/plain')
  whatsappVerify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    if (mode === 'subscribe' && this.config.WHATSAPP_VERIFY_TOKEN && token === this.config.WHATSAPP_VERIFY_TOKEN) return challenge;
    throw new ForbiddenException();
  }

  /** Inbound WhatsApp messages and delivery statuses. Signed with the app secret; idempotent on message id. */
  @Post('webhooks/whatsapp')
  @HttpCode(200)
  async whatsapp(@Req() req: RawBodyRequest<Request>, @Headers('x-hub-signature-256') signature: string | undefined, @Body() body: unknown) {
    this.inbox.verifySignature(req.rawBody, signature);
    return this.inbox.handleWebhook(body);
  }

  /** Fly's health check and the uptime monitor: 503 when the database does not answer within 2 s. */
  @Get('health')
  async health(@Res({ passthrough: true }) res: Response) {
    try {
      await Promise.race([
        this.db.query('select 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000).unref()),
      ]);
      return { ok: true, db: 'ok' };
    } catch {
      res.status(503);
      return { ok: false, db: 'down' };
    }
  }

  /** PayHere notify_url (application/x-www-form-urlencoded). Signature verified in the service. */
  @Post('webhooks/payhere/:propertyId')
  @HttpCode(200)
  async payhere(@Param('propertyId') propertyId: string, @Body() body: PayhereNotify) {
    return { result: await this.payments.payhereNotify(propertyId, body) };
  }

  /** PayPal webhook. The payload is only a hint; the order is re-read from PayPal before anything changes. */
  @Post('webhooks/paypal/:propertyId')
  @HttpCode(200)
  async paypal(@Param('propertyId') propertyId: string, @Body() body: { event_type?: string; resource?: unknown }) {
    return { result: await this.payments.paypalWebhook(propertyId, body) };
  }

  /** Per-room export pasted into Airbnb / Booking.com: /ical/{room_token}.ics */
  @Get('ical/:file')
  @Header('content-type', 'text/calendar; charset=utf-8')
  @Header('cache-control', 'no-cache, max-age=0')
  async exportIcal(@Param('file') file: string) {
    const token = file.replace(/\.ics$/i, '');
    const feed = /^[a-f0-9]{16,64}$/.test(token) ? await this.ical.exportFeed(token) : null;
    if (!feed) throw new NotFoundException();
    return feed;
  }
}
