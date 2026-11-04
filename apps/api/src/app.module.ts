import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module.js';
import { RevalidateService } from './common/revalidate.service.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AuthService } from './modules/auth/auth.service.js';
import { AvailabilityService } from './modules/availability/availability.service.js';
import { BookingsService } from './modules/bookings/bookings.service.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { FxService } from './modules/fx/fx.service.js';
import { IcalService } from './modules/ical/ical.service.js';
import { InventoryService } from './modules/inventory/inventory.service.js';
import { JobsService } from './modules/jobs/jobs.service.js';
import { EmailChannel, SmsChannel, WhatsAppChannel } from './modules/notifications/channels.js';
import { NotificationsService } from './modules/notifications/notifications.service.js';
import { OwnerController } from './modules/owner/owner.controller.js';
import { PaymentsService } from './modules/payments/payments.service.js';
import { CatalogService } from './modules/properties/catalog.service.js';
import { PropertiesService } from './modules/properties/properties.service.js';
import { PublicController } from './modules/public/public.controller.js';
import { WebhooksController } from './modules/public/webhooks.controller.js';
import { StorageService } from './modules/storage/storage.service.js';

export const DOMAIN_PROVIDERS = [
  RevalidateService,
  InventoryService,
  CatalogService,
  PropertiesService,
  FxService,
  AvailabilityService,
  EmailChannel,
  WhatsAppChannel,
  SmsChannel,
  NotificationsService,
  BookingsService,
  StorageService,
  PaymentsService,
  IcalService,
  DashboardService,
  AuthService,
  JobsService,
];

/** Shared by the HTTP app and the worker process. */
@Module({
  imports: [CommonModule],
  providers: DOMAIN_PROVIDERS,
  exports: DOMAIN_PROVIDERS,
})
export class DomainModule {}

@Module({
  imports: [DomainModule],
  controllers: [AuthController, PublicController, WebhooksController, OwnerController],
})
export class AppModule {}
