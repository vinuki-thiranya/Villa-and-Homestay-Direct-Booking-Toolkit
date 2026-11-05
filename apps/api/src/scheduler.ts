import { Logger, type INestApplicationContext } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import * as Sentry from '@sentry/node';
import { recordJobFailure } from './common/job-health.js';
import { JobsService, SCHEDULE } from './modules/jobs/jobs.service.js';

const QUEUE = 'staydirect-jobs';

/** Dev / single-process mode: plain intervals, one run at a time per job. */
export function startScheduler(app: INestApplicationContext): () => void {
  const jobs = app.get(JobsService);
  const log = new Logger('Scheduler');
  const running = new Set<string>();
  const timers = SCHEDULE.map((s) => {
    const tick = async () => {
      if (running.has(s.name)) return;
      running.add(s.name);
      try {
        await s.run(jobs);
      } catch (err) {
        log.error(`${s.name} failed: ${(err as Error).message}`);
        recordJobFailure(s.name, err);
        Sentry.captureException(err, { tags: { job: s.name } });
      } finally {
        running.delete(s.name);
      }
    };
    setTimeout(tick, 2_000);
    return setInterval(tick, s.everyMs);
  });
  log.log(`in-process scheduler started (${SCHEDULE.map((s) => s.name).join(', ')})`);
  return () => timers.forEach(clearInterval);
}

/** Production: BullMQ job schedulers on Upstash Redis (retries, one runner across worker instances). */
export async function startBullWorker(app: INestApplicationContext, redisUrl: string): Promise<() => Promise<void>> {
  const jobs = app.get(JobsService);
  const log = new Logger('Worker');
  const url = new URL(redisUrl);
  const connection = {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: decodeURIComponent(url.password) || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
  const queue = new Queue(QUEUE, { connection });
  for (const s of SCHEDULE) {
    await queue.upsertJobScheduler(s.name, { every: s.everyMs }, { name: s.name, opts: { attempts: 3, backoff: { type: 'exponential', delay: 10_000 }, removeOnComplete: 100, removeOnFail: 500 } });
  }
  const byName = new Map(SCHEDULE.map((s) => [s.name as string, s]));
  const worker = new Worker(
    QUEUE,
    async (job) => {
      const s = byName.get(job.name);
      if (!s) throw new Error(`Unknown job ${job.name}`);
      return s.run(jobs);
    },
    { connection, concurrency: 4 },
  );
  worker.on('failed', (job, err) => {
    log.error(`${job?.name} failed: ${err.message}`);
    recordJobFailure(job?.name ?? 'unknown', err);
    Sentry.captureException(err, { tags: { job: job?.name ?? 'unknown' } });
  });
  log.log(`BullMQ worker started on ${url.hostname}`);
  return async () => {
    await worker.close();
    await queue.close();
  };
}
