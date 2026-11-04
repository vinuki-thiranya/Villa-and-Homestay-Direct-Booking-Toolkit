/**
 * Release 3 owner API shapes (apps/api/src/modules/owner/owner-r3.controller.ts and its services)
 * plus the session/feature-flag helpers the owner pages share.
 */
import { cache } from 'react';
import type { FeatureFlag } from '@staydirect/shared';
import { ApiError } from './api';
import { ownerApi } from './owner';

export interface Me {
  user: { id: string; tenant_id: string; phone: string; email: string | null; name: string; role: 'owner' | 'manager' | 'staff'; language: string };
  tenant: { id: string; name: string; type: string; plan: 'basic' | 'pro' | 'pro_multi' | 'manager'; billing_status: string; base_currency: string; brand: unknown };
  propertyIds: string[] | null;
  flags: Record<FeatureFlag, boolean>;
}

export const getMe = cache(() => ownerApi<Me>('/auth/me'));

export const PLAN_LABEL: Record<string, string> = { basic: 'Basic', pro: 'Pro', pro_multi: 'Pro Multi', manager: 'Manager' };

/** Which plan first includes a feature (spec §8) — used in upgrade notes. */
export const FEATURE_INFO: Record<FeatureFlag, { label: string; plan: string }> = {
  ai_concierge: { label: 'AI concierge', plan: 'Pro' },
  housekeeping: { label: 'Housekeeping board', plan: 'Pro' },
  add_on_marketplace: { label: 'Experiences and add-ons', plan: 'Pro' },
  guest_crm: { label: 'Reviews and guest CRM', plan: 'Pro' },
  long_stay: { label: 'Monthly stays and nomad-visa invoices', plan: 'Pro' },
  multi_property: { label: 'More than one property', plan: 'Pro Multi' },
  owner_statements: { label: 'Property owners and statements', plan: 'Manager' },
  white_label: { label: 'Your own brand on guest sites', plan: 'Manager' },
  ota_direct_api: { label: 'Live Booking.com and Airbnb connection', plan: 'an add-on (LKR 4,000 / month)' },
};

/** A 403 the API sends when a feature is not in the tenant's plan. */
export function isPlanError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 403) return false;
  const code = (err.body as { code?: string } | null)?.code;
  return code === 'feature_not_in_plan' || code === 'plan_limit';
}

/** Call an owner endpoint and keep plan errors as values, so a page can show an upgrade note. */
export async function ownerTry<T>(path: string): Promise<{ data: T; error: null } | { data: null; error: ApiError }> {
  try {
    return { data: await ownerApi<T>(path), error: null };
  } catch (err) {
    if (err instanceof ApiError && (isPlanError(err) || err.status === 404)) return { data: null, error: err };
    throw err;
  }
}

// ---------------------------------------------------------------- response shapes
export interface PortfolioRow {
  propertyId: string;
  name: string;
  slug: string;
  ownerId: string | null;
  currency: string;
  today: string;
  arrivals: number;
  departures: number;
  rooms: number;
  occupiedTonight: number;
  occupancyTonightPct: number;
  unpaid: number;
  pendingApproval: number;
  conflicts: number;
  syncFailures: number;
  needsReply: number;
  openTasks: number;
}

export interface MultiCalendar {
  properties: { id: string; name: string; rooms: { id: string; name: string }[] }[];
  nights: {
    roomId: string;
    date: string;
    status: 'held' | 'reserved' | 'blocked';
    source: string;
    bookingId: string | null;
    bookingReference: string | null;
    guestName: string | null;
    note: string | null;
  }[];
}

export interface TeamData {
  members: { id: string; name: string; phone: string; role: 'owner' | 'manager' | 'staff'; propertyIds: string[]; since: string }[];
  invites: { id: string; name: string; phone: string; role: string; propertyIds: string[]; expiresAt: string; url: string }[];
}

export interface PropertyOwnerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  managementFeePct: number;
  notes: string;
  active: boolean;
  hasPayoutDetails: boolean;
  propertyIds: string[];
}

export type StatementCategory = 'direct' | 'ota' | 'ota_estimate' | 'add_on' | 'expense' | 'management_fee' | 'platform_fee';

export interface StatementPreview {
  ownerId: string;
  ownerName: string;
  period: string;
  currency: string;
  managementFeePct: number;
  directRevenue: number;
  otaRevenue: number;
  addOnIncome: number;
  managementFee: number;
  expenses: number;
  platformFees: number;
  payout: number;
  lines: { date: string; propertyName: string; category: StatementCategory; description: string; amount: number }[];
}

export interface FinalStatement {
  id: string;
  ownerId: string;
  ownerName: string;
  period: string;
  currency: string;
  payout: number;
  number: string | null;
  pdfUrl: string | null;
  createdAt: string;
  supersedesId: string | null;
}

export interface Brand {
  displayName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  whiteLabel: boolean;
}

export interface InvoiceRow {
  id: string;
  kind: 'booking' | 'long_stay' | 'owner_statement' | 'platform';
  number: string;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string;
  total: number;
  paid: number;
  pdfUrl: string | null;
  issuedAt: string;
}

export interface UtilityReading {
  id: string;
  meter: string;
  periodStart: string;
  periodEnd: string;
  startReading: number;
  endReading: number;
  unitRate: number;
  amount: number;
  invoiceId: string | null;
}

export interface ChannelConnection {
  id: string;
  propertyId: string;
  partner: string;
  externalPropertyId: string;
  roomMap: Record<string, string>;
  channels: string[];
  status: 'active' | 'paused' | 'error';
  needsFullPush: boolean;
  lastPushAt: string | null;
  lastPullAt: string | null;
  lastError: string | null;
  queued: number;
}

export interface SimAri {
  room_code: string;
  date: string;
  availability: number;
  rate: number | null;
  min_stay: number | null;
}

export interface LedgerRow {
  id: string;
  period: string;
  plan: string;
  billingModel: 'flat' | 'pct';
  properties: number;
  subscriptionFee: number;
  directBookingValue: number;
  pctFee: number;
  addOnCommission: number;
  totalDue: number;
  currency: string;
  status: 'due' | 'paid' | 'void';
  paidAt: string | null;
  note: string | null;
}

export interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  priority: 'low' | 'normal' | 'urgent';
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
}

export interface TicketThread {
  ticket: Ticket;
  messages: { author: string; fromStaff: boolean; body: string; createdAt: string }[];
}

/** "YYYY-MM" of a date string, and month arithmetic for pickers. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function shiftMonth(period: string, by: number): string {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export const TICKET_STATUS: Record<'open' | 'pending' | 'closed', { label: string; cls: string }> = {
  open: { label: 'Waiting for StayDirect', cls: 'bg-warn-bg text-warn' },
  pending: { label: 'Answered — your turn', cls: 'bg-ok-bg text-ok' },
  closed: { label: 'Closed', cls: 'bg-surface-2 text-muted' },
};
