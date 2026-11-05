import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import {
  SiteContentGenerateSchema,
  SiteContentStatusSchema,
  SiteContentUpsertSchema,
  SiteVerificationSchema,
  type SessionUser,
} from '@staydirect/shared';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { SeoContentService } from './seo-content.service.js';

const Uuid = new ParseUUIDPipe({ version: '4' });
type B<T extends z.ZodType> = z.infer<T>;

/** Owner app, Setup → Google & local guide: local content blocks, translations, Search Console code. */
@Controller('properties/:id/site-content')
@UseGuards(AuthGuard)
@Roles('owner', 'manager')
export class SeoController {
  constructor(private readonly content: SeoContentService) {}

  @Get()
  list(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string) {
    return this.content.list(u, id);
  }

  @Put()
  upsert(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SiteContentUpsertSchema)) b: B<typeof SiteContentUpsertSchema>) {
    return this.content.upsert(u, id, b);
  }

  @Post('status')
  status(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SiteContentStatusSchema)) b: B<typeof SiteContentStatusSchema>) {
    return this.content.setStatus(u, id, b);
  }

  @Post('generate')
  generate(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SiteContentGenerateSchema)) b: B<typeof SiteContentGenerateSchema>) {
    return this.content.generate(u, id, b);
  }

  @Delete(':key/:lang')
  remove(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Param('key') key: string, @Param('lang') lang: string) {
    return this.content.remove(u, id, key, lang);
  }

  @Put('verification')
  verification(@CurrentUser() u: SessionUser, @Param('id', Uuid) id: string, @Body(new ZodPipe(SiteVerificationSchema)) b: B<typeof SiteVerificationSchema>) {
    return this.content.setVerification(u, id, b.code);
  }
}
