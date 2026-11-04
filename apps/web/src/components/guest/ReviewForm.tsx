'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { publicApi } from '@/lib/client-api';
import { fmtDate } from '@/lib/format';

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

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** Post-stay review (spec §3.8): 4–5★ are published and invited to Google, 1–3★ go privately to the host. */
export function ReviewForm({ reference, token }: { reference: string; token: string }) {
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
        <h1 className="text-xl font-semibold">Review link not found</h1>
        <p className="mt-2 text-muted">Please use the link from your check-out message.</p>
      </div>
    );
  }
  if (!ctx) return <div className="card h-64 animate-pulse" aria-busy="true" aria-label="Loading" />;

  const finished = done ?? (ctx.review ? { public: ctx.review.public, googleReviewUrl: ctx.googleReviewUrl } : null);
  if (finished) {
    return (
      <div className="card space-y-3 p-6" role="status">
        <CheckCircle2 aria-hidden className="h-10 w-10 text-ok" />
        <h1 className="font-display text-2xl font-semibold">Thank you, {ctx.guestName.split(' ')[0]}!</h1>
        {finished.public ? (
          <>
            <p className="text-muted">Your review will help other travellers find {ctx.propertyName}.</p>
            {finished.googleReviewUrl && (
              <a href={finished.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Also review us on Google
              </a>
            )}
          </>
        ) : (
          <p className="text-muted">Your feedback went privately to the host. They read every message and may get in touch to make it right.</p>
        )}
      </div>
    );
  }

  if (!ctx.canReview) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold">Reviews open on {fmtDate(ctx.opensOn)}</h1>
        <p className="mt-2 text-muted">
          Your stay: {fmtDate(ctx.from)} → {fmtDate(ctx.to)}. Come back to this link on your check-out day.
        </p>
      </div>
    );
  }

  async function submit() {
    if (!rating) {
      setError('Choose a star rating.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDone(await publicApi<{ public: boolean; googleReviewUrl: string | null }>(`/public/reviews/${encodeURIComponent(reference)}`, { json: { token, rating, body } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your review');
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
        <h1 className="font-display text-2xl font-semibold">How was your stay at {ctx.propertyName}?</h1>
        <p className="mt-1 text-muted">
          {fmtDate(ctx.from)} → {fmtDate(ctx.to)}
        </p>
      </div>
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'} — ${LABELS[n]}`}
              onClick={() => setRating(n)}
              className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface-2"
            >
              <Star aria-hidden className={`h-8 w-8 ${n <= rating ? 'fill-accent text-accent' : 'text-line'}`} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm text-muted" aria-live="polite">
          {LABELS[rating]}
        </p>
      </fieldset>
      <div>
        <label htmlFor="review-body" className="label">
          Tell us more <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="review-body" rows={5} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} className="field py-2" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>
        {busy ? 'Sending…' : 'Send review'}
      </button>
    </form>
  );
}
