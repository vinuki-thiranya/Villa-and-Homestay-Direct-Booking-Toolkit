'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { publicApi } from '@/lib/client-api';
import { useGT } from './GuestI18n';

interface ReviewContext {
  propertyName: string;
  guestName: string;
  from: string;
  to: string;
  canReview: boolean;
  /** Check-out day, when reviews open. */
  opensOn: string;
  review: { rating: number; body: string; public: boolean } | null;
  googleReviewUrl: string | null;
}

const LABELS = ['', 'poor', 'fair', 'good', 'veryGood', 'excellent'] as const;

/** Post-stay review (spec §3.8): every guest is invited to Google; 4–5★ are also shown on the site, 1–3★ go privately to the host first. */
export function ReviewForm({ reference, token }: { reference: string; token: string }) {
  const t = useGT();
  const label = (n: number) => (n ? t(`review.labels.${LABELS[n]!}` as 'review.labels.poor') : '');
  const [ctx, setCtx] = useState<ReviewContext | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ public: boolean; googleReviewUrl: string | null } | null>(null);

  useEffect(() => {
    publicApi<ReviewContext>(`/public/reviews/${encodeURIComponent(reference)}?t=${encodeURIComponent(token)}`)
      .then(setCtx)
      .catch(() => setLoadError(true));
  }, [reference, token]);

  if (loadError) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold">{t('review.notFound')}</h1>
        <p className="mt-2 text-muted">{t('review.notFoundHint')}</p>
      </div>
    );
  }
  if (!ctx) return <div className="card h-64 animate-pulse" aria-busy="true" aria-label={t('review.loading')} />;

  const finished = done ?? (ctx.review ? { public: ctx.review.public, googleReviewUrl: ctx.googleReviewUrl } : null);
  if (finished) {
    return (
      <div className="card space-y-3 p-6" role="status">
        <CheckCircle2 aria-hidden className="h-10 w-10 text-ok" />
        <h1 className="font-display text-2xl font-semibold">{t('review.thanks', { name: ctx.guestName.split(' ')[0]! })}</h1>
        {finished.public ? (
          <p className="text-muted">{t('review.publicHint', { property: ctx.propertyName })}</p>
        ) : (
          <p className="text-muted">
            {t('review.privateHint')} {finished.googleReviewUrl && t('review.alsoGoogle')}
          </p>
        )}
        {/* Offered to every guest, whatever the rating: Google does not allow asking only happy guests. */}
        {finished.googleReviewUrl && (
          <a href={finished.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
            {t('review.google')}
          </a>
        )}
      </div>
    );
  }

  if (!ctx.canReview) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold">{t('review.opensOn', { date: t.date(ctx.opensOn) })}</h1>
        <p className="mt-2 text-muted">{t('review.opensHint', { from: t.date(ctx.from), to: t.date(ctx.to) })}</p>
      </div>
    );
  }

  async function submit() {
    if (!rating) {
      setError(t('review.chooseStars'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDone(await publicApi<{ public: boolean; googleReviewUrl: string | null }>(`/public/reviews/${encodeURIComponent(reference)}`, { json: { token, rating, body } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('review.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card space-y-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('review.title', { property: ctx.propertyName })}</h1>
        <p className="mt-1 text-muted">{t('review.dates', { from: t.date(ctx.from), to: t.date(ctx.to) })}</p>
      </div>
      <fieldset>
        <legend className="label">{t('review.yourRating')}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t('review.rating')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={t.n('review.starLabel', n, { label: label(n) })}
              onClick={() => setRating(n)}
              className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface-2"
            >
              <Star aria-hidden className={`h-8 w-8 ${n <= rating ? 'fill-accent text-accent' : 'text-line'}`} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm text-muted" aria-live="polite">
          {label(rating)}
        </p>
      </fieldset>
      <div>
        <label htmlFor="review-body" className="label">
          {t('review.more')} <span className="font-normal text-muted">{t('review.optional')}</span>
        </label>
        <textarea id="review-body" rows={5} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} className="field py-2" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>
        {busy ? t('review.sending') : t('review.send')}
      </button>
    </form>
  );
}
