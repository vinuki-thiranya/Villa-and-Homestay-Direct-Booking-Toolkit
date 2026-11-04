import { Inject, Injectable } from '@nestjs/common';
import { AwsClient } from 'aws4fetch';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CONFIG, type AppConfig } from '../../config.js';

export const LOCAL_UPLOAD_DIR = join(process.cwd(), '.uploads');

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** Cloudflare R2 (S3 API) in production; ./.uploads served by the API in dev. */
@Injectable()
export class StorageService {
  private readonly r2: AwsClient | null;

  constructor(@Inject(CONFIG) private readonly config: AppConfig) {
    this.r2 =
      config.R2_ACCOUNT_ID && config.R2_ACCESS_KEY_ID && config.R2_SECRET_ACCESS_KEY
        ? new AwsClient({ accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' })
        : null;
  }

  isAllowed(mime: string): boolean {
    return mime in EXT;
  }

  /** Store a file under a tenant-scoped prefix and return its URL. */
  async put(tenantId: string, folder: string, body: Buffer, mime: string): Promise<string> {
    const key = `${tenantId}/${folder}/${randomUUID()}.${EXT[mime] ?? 'bin'}`;
    if (this.r2) {
      const url = `https://${this.config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.config.R2_BUCKET}/${key}`;
      const res = await this.r2.fetch(url, { method: 'PUT', body: new Uint8Array(body), headers: { 'content-type': mime } });
      if (!res.ok) throw new Error(`R2 upload failed: HTTP ${res.status}`);
      return `${this.config.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
    }
    const path = join(LOCAL_UPLOAD_DIR, key);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, body);
    return `${this.config.PUBLIC_API_URL.replace(/\/$/, '')}/uploads/${key}`;
  }
}
