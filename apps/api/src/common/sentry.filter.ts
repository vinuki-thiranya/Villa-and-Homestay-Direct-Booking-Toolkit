import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

/** Reports server errors (5xx and anything unexpected) to Sentry; 4xx are the caller's mistake. */
@Catch()
export class SentryFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException) || exception.getStatus() >= 500) Sentry.captureException(exception);
    super.catch(exception, host);
  }
}
