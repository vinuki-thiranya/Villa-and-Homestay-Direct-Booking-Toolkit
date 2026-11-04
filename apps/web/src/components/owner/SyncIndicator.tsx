import Link from 'next/link';
import { RefreshCw, RefreshCwOff, TriangleAlert } from 'lucide-react';
import type { SyncHealthRow } from '@staydirect/shared';
import type { Translator } from '@/i18n/owner/t';
import { ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import type { ChannelConnection } from '@/lib/owner-r3';
import { tLabel } from './labels';

export type SyncState = { tone: 'ok' | 'bad' | 'none'; label: string; detail: string };

/** One answer to "are my OTA calendars in sync?" from the iCal feeds and the live channel connection. */
export function syncState(feeds: SyncHealthRow[], channel: ChannelConnection | null, t: Translator): SyncState {
  const failing = feeds.filter((s) => s.consecutiveFailures > 0 || s.lastStatus === 'error');
  const channelBad = channel && (channel.status === 'error' || (channel.status === 'active' && channel.lastError));
  if (failing.length || channelBad) {
    const names = failing.map((s) => `${s.roomName} (${tLabel(t, 'source', s.channel)})`);
    if (channelBad) names.push(channel.status === 'error' ? t('shared.sync.liveConnection') : t('shared.sync.liveError', { error: channel.lastError ?? '' }));
    return { tone: 'bad', label: t('shared.sync.failing'), detail: names.join(', ') };
  }
  const live = channel?.status === 'active';
  if (!feeds.length && !live) return { tone: 'none', label: t('shared.sync.noCalendars'), detail: t('shared.sync.noCalendarsDetail') };
  const times = feeds.map((s) => s.lastSuccessAt).filter((t): t is string => !!t);
  if (live && channel.lastPushAt) times.push(channel.lastPushAt);
  const oldest = times.sort()[0];
  return { tone: 'ok', label: t('shared.sync.inSync'), detail: oldest ? t('shared.sync.allSynced', { time: t.dateTime(oldest) }) : t('shared.sync.firstPending') };
}

/** Header chip: green in sync, red failing, grey nothing connected. Never breaks the page. */
export async function SyncIndicator({ propertyId }: { propertyId: string }) {
  const [feeds, channel, t] = await Promise.all([
    ownerApi<SyncHealthRow[]>(`/properties/${propertyId}/sync-health`).catch(() => null),
    ownerApi<ChannelConnection | null>(`/properties/${propertyId}/channel`).catch(() => null),
    getT(),
  ]);
  if (!feeds) return null;
  const s = syncState(feeds, channel, t);
  const Icon = s.tone === 'bad' ? TriangleAlert : s.tone === 'ok' ? RefreshCw : RefreshCwOff;
  const tone = s.tone === 'bad' ? 'border-bad/40 bg-bad-bg text-bad' : s.tone === 'ok' ? 'border-ok/30 bg-ok-bg text-ok' : 'border-line bg-surface-2 text-muted';
  return (
    <Link
      href="/owner/sync"
      title={s.detail}
      aria-label={t('shared.sync.chipLabel', { label: s.label, detail: s.detail })}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${tone}`}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {/* Phones: colour and icon only (the full state is in the aria-label); a failure always shows its words. */}
      <span className={s.tone === 'bad' ? '' : 'hidden sm:inline'}>{s.label}</span>
    </Link>
  );
}
