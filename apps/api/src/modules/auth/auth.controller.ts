import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { OtpRequestSchema, OtpVerifySchema, type SessionUser } from '@staydirect/shared';
import type { z } from 'zod';
import { AuthGuard, CurrentUser, Roles } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  request(@Body(new ZodPipe(OtpRequestSchema)) body: z.infer<typeof OtpRequestSchema>) {
    return this.auth.requestOtp(body.phone);
  }

  @Post('otp/verify')
  @HttpCode(200)
  verify(@Body(new ZodPipe(OtpVerifySchema)) body: z.infer<typeof OtpVerifySchema>) {
    return this.auth.verifyOtp(body.phone, body.code, body.name, body.inviteToken);
  }

  /** Admin console sign-in (platform admins only). */
  @Post('admin/verify')
  @HttpCode(200)
  adminVerify(@Body(new ZodPipe(OtpVerifySchema)) body: z.infer<typeof OtpVerifySchema>) {
    return this.auth.verifyAdmin(body.phone, body.code);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @Roles('owner', 'manager', 'staff')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.me(user);
  }
}
