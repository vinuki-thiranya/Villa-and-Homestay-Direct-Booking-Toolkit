import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module.js';
import { RevalidateService } from './common/revalidate.service.js';
import { CONFIG, type AppConfig } from './config.js';
import { AddOnsService } from './modules/addons/addons.service.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AuthService } from './modules/auth/auth.service.js';
import { AvailabilityService } from './modules/availability/availability.service.js';
import { BookingsService } from './modules/bookings/bookings.service.js';
import { ConciergeService, LLM_CLIENT, llmClientFactory } from './modules/concierge/concierge.service.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { GuestsService } from './modules/guests/guests.service.js';
import { InboxService } from './modules/inbox/inbox.service.js';
import { SetupService } from './modules/inbox/setup.service.js';
import { FxService } from './modules/fx/fx.service.js';
import { IcalService } from './modules/ical/ical.service.js';
import { InventoryService } from './modules/inventory/inventory.service.js';
import { JobsService } from './modules/jobs/jobs.service.js';
import { EmailChannel, SmsChannel, WhatsAppChannel } from './modules/notifications/channels.js';
import { NotificationsService } from './modules/notifications/notifications.service.js';
import { OpsService } from './modules/ops/ops.service.js';
import { OwnerR2Controller } from './modules/owner/owner-r2.controller.js';
import { OwnerController } from './modules/owner/owner.controller.js';
import { PaymentsService } from './modules/payments/payments.service.js';
import { CatalogService } from './modules/properties/catalog.service.js';
import { PropertiesService } from './modules/properties/properties.service.js';
import { PublicR2Controller } from './modules/public/public-r2.controller.js';
import { PublicController } from './modules/public/public.controller.js';
import { SequencesService } from './modules/sequences/sequences.service.js';
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
  InboxService,
  SetupService,
  ConciergeService,
  OpsService,
  AddOnsService,
  GuestsService,
  SequencesService,
  JobsService,
  { provide: LLM_CLIENT, useFactory: (config: AppConfig) => llmClientFactory(config), inject: [CONFIG] },
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
  controllers: [AuthController, PublicController, PublicR2Controller, WebhooksController, OwnerController, OwnerR2Controller],
})
export class AppModule {}
