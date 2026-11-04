import Link from 'next/link';
import { RefreshCw, RefreshCwOff, TriangleAlert } from 'lucide-react';
import type { SyncHealthRow } from '@staydirect/shared';
import { fmtDateTime, SOURCE_LABEL } from '@/lib/format';
import { ownerApi } from '@/lib/owner';
import type { ChannelConnection } from '@/lib/owner-r3';

export type SyncState = { tone: 'ok' | 'bad' | 'none'; label: string; detail: string };

/** One answer to "are my OTA calendars in sync?" from the iCal feeds and the live channel connection. */
export function syncState(feeds: SyncHealthRow[], channel: ChannelConnection | null): SyncState {
  const failing = feeds.filter((s) => s.consecutiveFailures > 0 || s.lastStatus === 'error');
  const channelBad = channel && (channel.status === 'error' || (channel.status === 'active' && channel.lastError));
  if (failing.length || channelBad) {
    const names = failing.map((s) => `${s.roomName} (${SOURCE_LABEL[s.channel] ?? s.channel})`);
    if (channelBad) names.push(channel.status === 'error' ? 'live channel connection' : `live channel: ${channel.lastError}`);
    return { tone: 'bad', label: 'Sync failing', detail: names.join(', ') };
  }
  const live = channel?.status === 'active';
  if (!feeds.length && !live) return { tone: 'none', label: 'No calendars', detail: 'No Airbnb or Booking.com calendar is connected.' };
  const times = feeds.map((s) => s.lastSuccessAt).filter((t): t is string => !!t);
  if (live && channel.lastPushAt) times.push(channel.lastPushAt);
  const oldest = times.sort()[0];
  return { tone: 'ok', label: 'In sync', detail: oldest ? `All calendars synced, oldest ${fmtDateTime(oldest)}` : 'Connected, first sync pending' };
}

/** Header chip: green in sync, red failing, grey nothing connected. Never breaks the page. */
export async function SyncIndicator({ propertyId }: { propertyId: string }) {
  const [feeds, channel] = await Promise.all([
    ownerApi<SyncHealthRow[]>(`/properties/${propertyId}/sync-health`).catch(() => null),
    ownerApi<ChannelConnection | null>(`/properties/${propertyId}/channel`).catch(() => null),
  ]);
  if (!feeds) return null;
  const s = syncState(feeds, channel);
  const Icon = s.tone === 'bad' ? TriangleAlert : s.tone === 'ok' ? RefreshCw : RefreshCwOff;
  const tone = s.tone === 'bad' ? 'border-bad/40 bg-bad-bg text-bad' : s.tone === 'ok' ? 'border-ok/30 bg-ok-bg text-ok' : 'border-line bg-surface-2 text-muted';
  return (
    <Link
      href="/owner/sync"
      title={s.detail}
      aria-label={`Calendar sync: ${s.label}. ${s.detail}`}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${tone}`}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {s.label}
    </Link>
  );
}
