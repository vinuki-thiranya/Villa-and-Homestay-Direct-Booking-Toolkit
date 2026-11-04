// Formatting for the admin console (server and client safe; no shared-package runtime import).

const lkr = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 });

export function formatLkr(n: number | string | null | undefined): string {
  return `LKR ${lkr.format(Number(n ?? 0))}`;
}

export function formatAmount(n: number | string | null | undefined, currency: string): string {
  const v = Number(n ?? 0);
  if (currency === 'LKR') return formatLkr(v);
  return `${currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "3 h ago" style, for sync and ticket freshness. */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const mins = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export const PLAN_LABELS: Record<string, string> = { basic: 'Basic', pro: 'Pro', pro_multi: 'Pro Multi', manager: 'Manager' };

export const FLAG_LABELS: Record<string, string> = {
  ai_concierge: 'AI concierge',
  housekeeping: 'Housekeeping',
  add_on_marketplace: 'Add-on marketplace',
  guest_crm: 'Reviews and guest CRM',
  long_stay: 'Long stays',
  multi_property: 'Multiple properties',
  owner_statements: 'Owner statements',
  white_label: 'White label',
  ota_direct_api: 'Direct OTA connection',
};

/** Previous calendar month as YYYY-MM (what the billing job bills). */
export function previousMonth(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}
