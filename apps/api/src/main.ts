import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { requestContextMiddleware } from './common/request-context.js';
import { loadConfig } from './config.js';
import { LOCAL_UPLOAD_DIR } from './modules/storage/storage.service.js';
import { startScheduler } from './scheduler.js';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false, rawBody: true }); // rawBody: WhatsApp signatures
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(requestContextMiddleware);
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '256kb' }); // PayHere notify
  // Guest sites live on many hostnames (subdomains + custom domains), so CORS for the public API is open;
  // owner endpoints use bearer tokens, not cookies, so this does not expose credentials.
  app.enableCors({ origin: true, credentials: false });
  if (!config.R2_ACCOUNT_ID) app.useStaticAssets(LOCAL_UPLOAD_DIR, { prefix: '/uploads/' });
  app.enableShutdownHooks();
  await app.listen(config.PORT);
  Logger.log(`API listening on :${config.PORT}`, 'Bootstrap');

  // Without Redis (dev), run the recurring jobs in-process; production runs them in the worker.
  if (!config.REDIS_URL) startScheduler(app);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
