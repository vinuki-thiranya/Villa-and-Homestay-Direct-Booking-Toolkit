import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const ConfigSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().optional().default(''),
  ROOT_DOMAIN: z.string().default('staydirect.lk'),
  PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  WEB_URL: z.string().default('http://localhost:3000/s'),
  OWNER_APP_URL: z.string().default('http://localhost:3000/owner'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SMS_PROVIDER: z.enum(['console', 'notifylk']).default('console'),
  OTP_DEV_CODE: z.string().optional().default(''),
  NOTIFYLK_USER_ID: z.string().optional().default(''),
  NOTIFYLK_API_KEY: z.string().optional().default(''),
  NOTIFYLK_SENDER_ID: z.string().optional().default('NotifyDEMO'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('StayDirect LK <bookings@staydirect.lk>'),
  WHATSAPP_TOKEN: z.string().optional().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(''),
  WHATSAPP_ALERT_TEMPLATE: z.string().default('owner_alert'),
  PAYHERE_SANDBOX: bool,
  PAYPAL_SANDBOX: bool,
  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET: z.string().default('staydirect'),
  R2_PUBLIC_URL: z.string().optional().default(''),
  FX_FEED_URL: z.string().default('https://open.er-api.com/v6/latest/USD'),
  WEB_REVALIDATE_URL: z.string().optional().default(''),
  REVALIDATE_SECRET: z.string().optional().default(''),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cached: AppConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (cached && env === process.env) return cached;
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${issues}`);
  }
  if (parsed.data.NODE_ENV === 'production') {
    if (!parsed.data.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is required in production');
    if (parsed.data.OTP_DEV_CODE) throw new Error('OTP_DEV_CODE must be empty in production');
  }
  if (env === process.env) cached = parsed.data;
  return parsed.data;
}

export const CONFIG = Symbol('CONFIG');
