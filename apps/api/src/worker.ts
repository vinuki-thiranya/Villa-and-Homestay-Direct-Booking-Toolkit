import 'reflect-metadata';
import { initSentry } from './instrument.js';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DomainModule } from './app.module.js';
import { loadConfig } from './config.js';
import { startBullWorker, startScheduler } from './scheduler.js';

initSentry('worker');

/** Separate Fly.io process group: iCal sync, hold sweeper, follow-ups, FX refresh. */
async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.createApplicationContext(DomainModule);
  app.enableShutdownHooks();
  if (config.REDIS_URL) {
    const stop = await startBullWorker(app, config.REDIS_URL);
    process.on('SIGTERM', () => void stop().then(() => app.close()));
  } else {
    Logger.warn('REDIS_URL not set: running jobs with in-process intervals', 'Worker');
    startScheduler(app);
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
