import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { Stars } from '@/components/Stars';
import { Check, Empty, TextArea } from '@/components/owner/fields';
import { fmtDate } from '@/lib/format';
import { currentProperty, ownerApi } from '@/lib/owner';
import type { Review } from '@/lib/owner-types';
import { replyReviewAction } from '../../actions-r2';

export const metadata = { title: 'Reviews' };

export default async function ReviewsPage() {
  const property = await currentProperty();
  if (!property) return null;
  const reviews = await ownerApi<Review[]>(`/properties/${property.id}/reviews`);
  const published = reviews.filter((r) => r.public);
  const avg = published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : null;
  const privateCount = reviews.length - published.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted">
          {avg != null ? `★ ${avg.toFixed(1)} from ${published.length} public review${published.length === 1 ? '' : 's'}` : 'No public reviews yet'}
          {privateCount > 0 && ` · ${privateCount} private`}
          . Guests are asked on check-out day; 4–5★ are shown on your site and invited to Google, 1–3★ come only to you.
        </p>
      </div>
      {reviews.length === 0 ? (
        <Empty>No reviews yet. The check-out message asks every direct guest for one.</Empty>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className={`card p-4 ${r.public ? '' : 'border-warn/50'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={r.rating} />
                <p className="font-medium">{r.guestName}</p>
                {r.bookingReference && (
                  <Link href={`/owner/bookings/${r.bookingId}`} className="text-sm text-brand">
                    {r.bookingReference}
                  </Link>
                )}
                <span className={`pill ml-auto ${r.public ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>{r.public ? 'Public' : 'Private'}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{fmtDate(r.createdAt)}</p>
              {r.body ? <p className="mt-2 whitespace-pre-line">{r.body}</p> : <p className="mt-2 text-sm text-muted">No comment.</p>}
              {r.ownerReply && (
                <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <strong>Your reply:</strong> {r.ownerReply}
                </p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand">{r.ownerReply ? 'Edit reply' : 'Reply'}</summary>
                <div className="mt-3">
                  <ActionForm action={replyReviewAction.bind(null, r.id)} submitLabel="Save reply">
                    <TextArea label="Reply" name="reply" id={`reply-${r.id}`} required rows={3} defaultValue={r.ownerReply ?? ''} />
                    <Check label="Show this review on my site" name="public" defaultChecked={r.public} />
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
