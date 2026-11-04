import { getT } from '@/lib/owner-i18n';
import { tLabel } from './labels';

export async function OrderBadge({ status }: { status: string }) {
  const t = await getT();
  const tone =
    status === 'confirmed' ? 'bg-ok-bg text-ok' : status === 'done' ? 'bg-surface-2 text-fg' : status === 'cancelled' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn';
  return <span className={`pill ${tone}`}>{tLabel(t, 'orderStatus', status)}</span>;
}
