import { Global, Module } from '@nestjs/common';
import { CONFIG, loadConfig } from '../config.js';
import { AuthGuard, TokenService } from './auth.js';
import { DbService } from './db.service.js';

@Global()
@Module({
  providers: [{ provide: CONFIG, useFactory: () => loadConfig() }, DbService, TokenService, AuthGuard],
  exports: [CONFIG, DbService, TokenService, AuthGuard],
})
export class CommonModule {}
