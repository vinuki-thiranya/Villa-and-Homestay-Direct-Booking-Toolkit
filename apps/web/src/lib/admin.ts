// Server-side helpers for the StayDirect admin console: its own session cookie and API calls.
// Admin tokens and owner tokens are not interchangeable (apps/api/src/common/auth.ts AdminGuard).
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from './api';

export const ADMIN_COOKIE = 'sd_admin';

export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
}

/** Authenticated admin API call; a missing, expired or non-admin token goes back to the admin login. */
export async function adminApi<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getAdminToken();
  if (!token) redirect('/admin/login');
  try {
    return await apiFetch<T>(path, { ...opts, token });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect('/admin/login?expired=1');
    throw err;
  }
}

// ---------------------------------------------------------------- API shapes (apps/api/src/modules/admin, billing, branding)

export interface AdminMe {
  adminId: string;
  phone: string;
  name: string;
}

export interface AdminOverview {
  tenants: number;
  properties: number;
  billingIssues: number;
  syncFailures: number;
  openTickets: number;
  owedLkr: number;
  directBookings30d: number;
}

export interface AdminTenantRow {
  id: string;
  name: string;
  type: string;
  plan: string;
  billingStatus: string;
  billingModel: string;
  subscriptionStatus: string | null;
  properties: number;
  syncFailures: number;
  owedLkr: number;
  openTickets: number;
  ownerPhone: string | null;
  createdAt: string;
}

export interface AdminTenantDetail {
  id: string;
  name: string;
  type: string;
  plan: string;
  billingStatus: string;
  subscription: { billingModel: string; status: string; startedAt: string; renewsAt: string | null } | null;
  flags: Record<string, boolean>;
  overrides: { key: string; enabled: boolean; updatedBy: string | null; updatedAt: string }[];
  users: { id: string; name: string; phone: string; role: string; since: string }[];
  properties: {
    id: string;
    name: string;
    slug: string;
    customDomain: string | null;
    published: boolean;
    siteUrl: string;
    gateways: string[];
    conciergeEnabled: boolean;
    channel: { partner: string; status: string; last_push_at: string | null; last_pull_at: string | null; last_error: string | null } | null;
    sync: { roomName: string; channel: string; lastSuccessAt: string | null; lastStatus: string | null; lastError: string | null; failures: number }[];
  }[];
}

export interface AdminFlag {
  key: string;
  description: string;
  defaultEnabled: boolean;
  plans: string[];
  overrides: number;
}

export interface LedgerRow {
  id: string;
  tenantId: string;
  tenantName: string | null;
  period: string;
  plan: string;
  billingModel: string;
  properties: number;
  subscriptionFee: number;
  directBookingValue: number;
  pctFee: number;
  addOnCommission: number;
  adjustment: number;
  totalDue: number;
  currency: string;
  status: 'due' | 'paid' | 'void';
  paidAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface ThemeTokens {
  brand: string;
  brandStrong: string;
  accent: string;
  bg: string;
  surface2: string;
  radius: string;
  fontDisplay?: string;
  fontSans?: string;
}

export interface AdminTheme {
  key: string;
  name: string;
  tokens: ThemeTokens;
  published: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface TranslationRow {
  key: string;
  locked: boolean;
  values: Record<string, { default: string; override: string | null }>;
}

export interface TicketRow {
  id: string;
  tenantId: string;
  tenantName: string | null;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  priority: 'low' | 'normal' | 'urgent';
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
}

export interface TicketThread {
  ticket: TicketRow;
  messages: { author: string; fromStaff: boolean; body: string; createdAt: string }[];
}

/** A Sri Lankan public holiday (GET /admin/holidays); same shape as Holiday in @staydirect/shared. */
export interface AdminHoliday {
  date: string;
  nameEn: string;
  nameSi: string;
  isPoya: boolean;
  types: string[];
}
