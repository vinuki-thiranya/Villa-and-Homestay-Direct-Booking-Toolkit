import { ORDER_STATUS_LABEL } from '@/lib/owner-types';

export function OrderBadge({ status }: { status: string }) {
  const tone =
    status === 'confirmed' ? 'bg-ok-bg text-ok' : status === 'done' ? 'bg-surface-2 text-fg' : status === 'cancelled' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn';
  return <span className={`pill ${tone}`}>{ORDER_STATUS_LABEL[status] ?? status}</span>;
}
