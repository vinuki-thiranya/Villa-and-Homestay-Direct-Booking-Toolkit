import Link from 'next/link';
import { ActionForm } from '@/components/owner/ActionForm';
import { Stars } from '@/components/Stars';
import { Check, Empty, TextArea } from '@/components/owner/fields';
import { currentProperty, ownerApi } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import type { Review } from '@/lib/owner-types';
import { replyReviewAction } from '../../actions-r2';

export async function generateMetadata() {
  return { title: (await getT())('reviews.title') };
}

export default async function ReviewsPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [reviews, t] = await Promise.all([ownerApi<Review[]>(`/properties/${property.id}/reviews`), getT()]);
  const published = reviews.filter((r) => r.public);
  // Same as the guest site: every rating counts, whether or not its text is shown.
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const privateCount = reviews.length - published.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t('reviews.title')}</h1>
        <p className="text-sm text-muted">
          {avg != null ? t.n('reviews.summary', reviews.length, { avg: avg.toFixed(1) }) : t('reviews.noPublic')}
          {privateCount > 0 && ` · ${t('reviews.privateCount', { n: privateCount })}`}. {t('reviews.how')}
        </p>
      </div>
      {reviews.length === 0 ? (
        <Empty>{t('reviews.empty')}</Empty>
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
                <span className={`pill ml-auto ${r.public ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>{r.public ? t('reviews.public') : t('reviews.private')}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{t.date(r.createdAt)}</p>
              {r.body ? <p className="mt-2 whitespace-pre-line">{r.body}</p> : <p className="mt-2 text-sm text-muted">{t('reviews.noComment')}</p>}
              {r.ownerReply && (
                <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <strong>{t('reviews.yourReply')}</strong> {r.ownerReply}
                </p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand">{r.ownerReply ? t('reviews.editReply') : t('reviews.reply')}</summary>
                <div className="mt-3">
                  <ActionForm action={replyReviewAction.bind(null, r.id)} submitLabel={t('reviews.saveReply')}>
                    <TextArea label={t('reviews.reply')} name="reply" id={`reply-${r.id}`} required rows={3} defaultValue={r.ownerReply ?? ''} />
                    <Check label={t('reviews.showOnSite')} name="public" defaultChecked={r.public} />
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
