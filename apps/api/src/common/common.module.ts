import { Global, Module } from '@nestjs/common';
import { CONFIG, loadConfig } from '../config.js';
import { AdminGuard, AuthGuard, TokenService } from './auth.js';
import { DbService } from './db.service.js';

@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: () => loadConfig() }, DbService, TokenService, AuthGuard, AdminGuard],
  exports: [CONFIG, DbService, TokenService, AuthGuard, AdminGuard],
})
export class CommonModule {}
