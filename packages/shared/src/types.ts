import type {
  BookingMode,
  BookingStatus,
  CancellationPolicy,
  IcalChannel,
  NightSource,
  NightStatus,
  PaymentMethod,
  PaymentStatus,
  PropertyType,
  Theme,
  UserRole,
} from './enums.js';
import type { StayQuote, StayViolation } from './pricing.js';

// ---------- public (guest site) ----------
export interface PublicRoom {
  id: string;
  name: string;
  description: string;
  maxGuests: number;
  baseGuests: number;
  beds: string;
  bathroom: string;
  amenities: string[];
  photos: string[];
  baseRate: number;
  minNights: number;
  bookingMode: BookingMode;
}

export interface PublicProperty {
  id: string;
  slug: string;
  name: string;
  type: PropertyType;
  description: string;
  address: string;
  area: string;
  lat: number | null;
  lng: number | null;
  sltdaNumber: string | null;
  checkIn: string;
  checkOut: string;
  timezone: string;
  whatsappNumber: string | null;
  email: string | null;
  baseCurrency: string;
  houseRules: string;
  defaultCancellationPolicy: CancellationPolicy;
  defaultDepositPct: number;
  theme: Theme;
  photos: string[];
  customDomain: string | null;
  hostName: string;
  hostPhotoUrl: string | null;
  /** Looping hero video (MP4/WebM); photos[0] is the poster. */
  heroVideoUrl: string | null;
  /** Public review average (1–5) and count; null average when there are none. */
  reviewSummary: { average: number | null; count: number };
  /** Median minutes to the first reply on WhatsApp over 90 days; null when there is too little data. */
  responseMinutes: number | null;
  paymentMethods: PaymentMethod[];
  paypalClientId: string | null;
  rooms: PublicRoom[];
  /** Units of currency per USD for the display-currency switcher. */
  fx: Record<string, number>;
  /** Subscription unpaid past grace: site shows "enquire on WhatsApp" instead of instant booking (spec §8). */
  bookingDisabled: boolean;
  /** Manager plan: hide "Powered by StayDirect" and use the tenant brand. */
  whiteLabel: boolean;
  brand: { displayName: string; logoUrl: string | null; primaryColor: string | null; accentColor: string | null } | null;
  /** CSS variable values from the admin theme editor for this property's theme. */
  themeTokens: Record<string, string> | null;
  /** Search Console HTML-tag verification code, entered by the owner. */
  googleSiteVerification: string | null;
  /** The property's Google Maps / review link (JSON-LD sameAs). */
  googleReviewUrl: string | null;
  /**
   * Published local content and translations, content[lang][key]. Keys: getting_here,
   * things_to_do, best_time, description, room:{roomId}. Drafts never appear here.
   */
  content: SiteContentMap;
  /** Last change to the site's data (sitemap lastmod). */
  updatedAt: string;
}

export type SiteContentMap = Partial<Record<string, Record<string, string>>>;

/** One block of site content in one language, as the owner app edits it. */
export interface SiteContentRow {
  key: string;
  lang: string;
  body: string;
  status: 'draft' | 'published';
  source: 'ai' | 'owner';
  updatedAt: string;
}

/** A Sri Lankan public holiday (Poya days marked), for owner calendars. */
export interface Holiday {
  date: string;
  nameEn: string;
  nameSi: string;
  isPoya: boolean;
  types: string[];
}

/** Nights on which no room can be booked, for greying out the date picker. */
export interface SiteCalendar {
  from: string;
  to: string;
  closed: string[];
}

export interface DisplayAmounts {
  currency: string;
  total: number;
  deposit: number;
  perNight: number;
}

export interface RoomAvailability {
  roomId: string;
  available: boolean;
  /** Why the room cannot be booked for these dates (empty when available). */
  violations: (StayViolation | 'unavailable')[];
  quote: StayQuote | null;
  display: DisplayAmounts | null;
}

export interface AvailabilityResult {
  from: string;
  to: string;
  guests: number;
  baseCurrency: string;
  displayCurrency: string;
  rooms: RoomAvailability[];
  /** The discount code applied to these quotes, if any. */
  promo?: { code: string; pct: number } | null;
}

export interface PublicBooking {
  reference: string;
  status: BookingStatus;
  mode: BookingMode;
  awaitingApproval: boolean;
  propertyName: string;
  propertySlug: string;
  roomName: string;
  from: string;
  to: string;
  guests: number;
  guestName: string;
  currency: string;
  total: number;
  deposit: number;
  paid: number;
  balance: number;
  balanceDueDate: string | null;
  cancellationPolicy: CancellationPolicy;
  cancellationPolicyText: string;
  holdExpiresAt: string | null;
  paymentMethods: PaymentMethod[];
  checkIn: string;
  checkOut: string;
  address: string;
  mapsUrl: string | null;
  hostWhatsapp: string | null;
  /** The booking-confirmed WhatsApp message exactly as the guest receives it. */
  confirmationMessage: string;
}

export interface CreateBookingResult {
  reference: string;
  token: string;
  status: BookingStatus;
  holdExpiresAt: string;
}

export type PaymentStart =
  | { method: 'payhere'; action: string; fields: Record<string, string> }
  | { method: 'paypal'; clientId: string; orderId: string; currency: string; amount: string; env: 'sandbox' | 'live' }
  | {
      method: 'lankaqr';
      qrImageUrl: string;
      merchantName: string;
      amount: string;
      currency: 'LKR';
      reference: string;
      holdExpiresAt: string;
    }
  | {
      method: 'bank';
      accountName: string;
      bankName: string;
      accountNumber: string;
      branch: string;
      swift: string;
      notes: string;
      amount: string;
      currency: string;
      reference: string;
      holdExpiresAt: string;
    };

// ---------- owner ----------
export interface SessionUser {
  id: string;
  tenantId: string;
  phone: string;
  name: string;
  role: UserRole;
  /** Properties a manager/staff user is limited to (null = all). Filled per request by AuthGuard. */
  propertyIds?: string[] | null;
}

export interface AuthResult {
  token: string;
  user: SessionUser;
  isNew: boolean;
}

export interface OwnerBookingRow {
  id: string;
  reference: string;
  status: BookingStatus;
  source: NightSource;
  roomId: string;
  roomName: string;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  from: string;
  to: string;
  guests: number;
  total: number;
  currency: string;
  deposit: number;
  paid: number;
  balance: number;
  needsRefund: boolean;
  mode: BookingMode;
  createdAt: string;
}

export interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  baseAmount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayRef: string | null;
  slipUrl: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface CalendarNight {
  roomId: string;
  date: string;
  status: NightStatus;
  source: NightSource;
  bookingId: string | null;
  bookingReference: string | null;
  note: string | null;
}

export interface SyncHealthRow {
  sourceId: string;
  roomId: string;
  roomName: string;
  channel: IcalChannel;
  url: string;
  lastFetchAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  consecutiveFailures: number;
}

export interface ConflictRow {
  id: string;
  roomId: string;
  roomName: string;
  date: string;
  channel: IcalChannel;
  externalUid: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  detectedAt: string;
  resolution: string | null;
}

export interface OwnerDashboard {
  propertyId: string;
  currency: string;
  today: string;
  arrivalsToday: OwnerBookingRow[];
  departuresToday: OwnerBookingRow[];
  upcomingArrivals: OwnerBookingRow[];
  pendingApproval: OwnerBookingRow[];
  unpaidBalances: OwnerBookingRow[];
  month: {
    label: string;
    occupancyPct: number;
    adr: number;
    revenueBySource: { source: NightSource; revenue: number; nights: number }[];
    directRevenue: number;
    commissionSaved: number;
  };
  syncHealth: SyncHealthRow[];
  openConflicts: ConflictRow[];
  pendingSlips: number;
}
