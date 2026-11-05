/**
 * Response shapes of the Release 2 owner API (apps/api/src/modules/owner/owner-r2.controller.ts
 * and the services it calls). Kept here, not in @staydirect/shared, because they are web-only views.
 */
import type { Guide } from '@staydirect/shared';

export interface Conversation {
  id: string;
  propertyId: string;
  guestId: string | null;
  contact: string;
  contactName: string;
  language: string;
  status: 'open' | 'needs_human' | 'closed';
  aiPaused: boolean;
  escalationSummary: string | null;
  unreadCount: number;
  lastInboundAt: string | null;
  lastMessageAt: string;
  lastMessage: string | null;
  windowOpen: boolean;
}

export interface InboxMessage {
  id: string;
  direction: 'in' | 'out';
  body: string;
  status: string;
  sentBy: string | null;
  aiGenerated: boolean;
  templateId: string | null;
  error: string | null;
  createdAt: string;
}

export interface Thread {
  conversation: Conversation;
  messages: InboxMessage[];
  bookings: { id: string; reference: string; status: string; from: string; to: string; roomName: string }[];
}

export interface QuickReply {
  id: string;
  topic: string;
  language: string;
  title: string;
  body: string;
  sortOrder: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  body: string;
  language: string;
  updatedAt: string;
}

export interface ConciergeSettings {
  conciergeEnabled: boolean;
  whatsappPhoneNumberId: string | null;
  googleReviewUrl: string | null;
  repeatGuestDiscountPct: number;
  guide: Guide;
  guideUrl: string;
  aiUsage: { month: string; requests: number; costUsd: number };
}

export interface SequenceSetting {
  trigger: string;
  enabled: boolean;
  channel: 'auto' | 'whatsapp' | 'email';
}

export interface Staff {
  id: string;
  name: string;
  phone: string | null;
  role: 'cleaner' | 'maintenance' | 'front_desk';
  active: boolean;
  taskListUrl?: string;
}

export interface Task {
  id: string;
  propertyId: string;
  roomId: string | null;
  roomName: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  date: string;
  type: 'clean' | 'prepare' | 'maintenance' | 'shopping';
  title: string;
  assigneeStaffId: string | null;
  assigneeName: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'skipped';
  photos: string[];
  notes: string;
  cost: number | null;
  completedAt: string | null;
  source: string;
}

export interface Provider {
  id: string;
  name: string;
  phone: string;
  serviceTypes: string[];
  rating: number | null;
  ratingCount: number;
  active: boolean;
  removedAt?: string | null;
  removedReason?: string | null;
}

export interface OwnerAddOn {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  leadTimeHours: number;
  photoUrl: string | null;
  providerId: string | null;
  providerName: string | null;
  commissionPct: number;
  platformPct: number;
  active: boolean;
  sortOrder: number;
}

export interface AddOnOrder {
  id: string;
  bookingId: string;
  bookingReference: string | null;
  guestName: string | null;
  addOnId: string;
  addOnName: string | null;
  providerId: string | null;
  providerName: string | null;
  date: string;
  time: string | null;
  qty: number;
  amount: number;
  currency: string;
  providerAmount: number;
  ownerAmount: number;
  platformAmount: number;
  status: 'requested' | 'confirmed' | 'done' | 'cancelled';
  notes: string;
  providerNotifiedAt: string | null;
  providerConfirmedAt: string | null;
  rating: number | null;
  createdAt: string;
}

export interface Commissions {
  month: string;
  byCurrency: { currency: string; orders: number; sales: number; ownerEarned: number; platformDue: number; providerPayouts: number }[];
}

export interface Review {
  id: string;
  bookingId: string;
  bookingReference: string | null;
  rating: number;
  body: string;
  public: boolean;
  guestName: string;
  ownerReply: string | null;
  createdAt: string;
}

export interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  language: string;
  notes: string;
  stays: number;
  lastStay: string | null;
  totalPaid: number;
  repeat: boolean;
}

export interface DiscountCode {
  id: string;
  code: string;
  pct: number;
  guestId: string | null;
  guestName: string | null;
  validFrom: string;
  expiresAt: string;
  maxUses: number;
  uses: number;
  reason: 'manual' | 'repeat_guest';
  active: boolean;
}

export interface GuestDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  language: string;
  notes: string;
  keepProfile: boolean;
  anonymizedAt: string | null;
  bookings: { id: string; reference: string; status: string; from: string; to: string; roomName: string; total: number; paid: number; currency: string }[];
  discountCodes: DiscountCode[];
  reviews: Review[];
}

export const LANGUAGE_LABEL: Record<string, string> = { en: 'English', de: 'Deutsch', fr: 'Français', hi: 'हिन्दी' };

export const TRIGGER_LABEL: Record<string, { title: string; when: string }> = {
  booking_confirmed: { title: 'Booking confirmed', when: 'On WhatsApp right after the deposit is paid (the email goes out anyway)' },
  pre_arrival_7d: { title: '7 days before', when: 'How to get here' },
  pre_arrival_1d: { title: '1 day before', when: 'Check-in time and directions' },
  arrival: { title: 'Arrival day', when: 'House guide link with Wi-Fi (after 12:00)' },
  mid_stay: { title: 'Mid-stay', when: 'Experiences and add-ons (stays of 4+ nights)' },
  check_out: { title: 'Check-out', when: 'Thank you + review request' },
};

export const TASK_TYPE_LABEL: Record<string, string> = { clean: 'Clean', prepare: 'Prepare', maintenance: 'Maintenance', shopping: 'Shopping' };
export const TASK_STATUS_LABEL: Record<string, string> = { todo: 'To do', in_progress: 'In progress', done: 'Done', skipped: 'Skipped' };
export const STAFF_ROLE_LABEL: Record<string, string> = { cleaner: 'Cleaner', maintenance: 'Maintenance', front_desk: 'Front desk' };

export const ADD_ON_CATEGORY_LABEL: Record<string, string> = {
  airport_pickup: 'Airport pickup',
  driver: 'Driver day hire',
  tuk_tuk: 'Tuk-tuk',
  surf_lesson: 'Surf lesson',
  whale_watching: 'Whale watching',
  safari: 'Safari',
  cooking_class: 'Cooking class',
  laundry: 'Laundry',
  bicycle: 'Bicycle',
  other: 'Other',
};

export const ORDER_STATUS_LABEL: Record<string, string> = { requested: 'Requested', confirmed: 'Confirmed', done: 'Done', cancelled: 'Cancelled' };

export const PLACE_KINDS = ['restaurant', 'cafe', 'beach', 'atm', 'pharmacy', 'hospital', 'supermarket', 'sight', 'other'] as const;
