'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { publicApi } from '@/lib/client-api';
import { formatMoney } from '@/lib/format';
import { useGT } from './GuestI18n';

interface CatalogueItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  leadTimeHours: number;
  photoUrl: string | null;
}

interface GuestOrder {
  id: string;
  addOnName: string | null;
  date: string;
  time: string | null;
  qty: number;
  amount: number;
  currency: string;
  status: 'requested' | 'confirmed' | 'done' | 'cancelled';
  rating?: number | null;
}

interface GuestAddOns {
  canOrder: boolean;
  stay: { from: string; to: string };
  catalogue: CatalogueItem[];
  orders: GuestOrder[];
}

const today = () => new Date().toISOString().slice(0, 10);

/** Stars + comment for an experience that has happened (provider ratings, spec §3.7). */
function RateOrder({ reference, token, orderId, name, onRated }: { reference: string; token: string; orderId: string; name: string; onRated: () => void }) {
  const t = useGT();
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <button type="button" className="min-h-11 text-sm font-medium text-brand underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
        {t('addons.rate.open')}
      </button>
    );
  }
  return (
    <form
      className="w-full space-y-2 pt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setError(t('addons.rate.choose'));
        setBusy(true);
        setError(null);
        try {
          await publicApi(`/public/bookings/${encodeURIComponent(reference)}/add-ons/${orderId}/rating`, {
            json: { token, rating, comment: String(new FormData(e.currentTarget).get('comment') ?? '') },
          });
          onRated();
        } catch (err) {
          setError(err instanceof Error ? err.message : t('addons.rate.failed'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset>
        <legend className="text-sm font-medium">{t('addons.rate.how', { name })}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t('addons.rate.rating')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={t.n('addons.rate.star', n)}
              onClick={() => setRating(n)}
              className={`h-11 w-11 text-2xl ${n <= rating ? 'text-accent' : 'text-line'}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`c-${orderId}`} className="sr-only">
        {t('addons.rate.comment')}
      </label>
      <textarea id={`c-${orderId}`} name="comment" rows={2} maxLength={1000} className="field py-2" placeholder={t('addons.rate.commentHint')} />
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? t('addons.rate.sending') : t('addons.rate.send')}
      </button>
    </form>
  );
}

function minus1(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Experiences the guest can add to a confirmed stay (spec §3.7). Paid with the balance. */
export function AddOnsPanel({ reference, token, onOrdered }: { reference: string; token: string; onOrdered?: () => void }) {
  const t = useGT();
  const [data, setData] = useState<GuestAddOns | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await publicApi<GuestAddOns>(`/public/bookings/${encodeURIComponent(reference)}/add-ons?t=${encodeURIComponent(token)}`));
    } catch {
      setData(null);
    }
  }, [reference, token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data || (data.catalogue.length === 0 && data.orders.length === 0)) return null;

  async function order(item: CatalogueItem, form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true);
    setMsg(null);
    try {
      await publicApi(`/public/bookings/${encodeURIComponent(reference)}/add-ons`, {
        json: {
          token,
          addOnId: item.id,
          date: String(fd.get('date')),
          time: String(fd.get('time') ?? '') || null,
          qty: Number(fd.get('qty') ?? 1),
          notes: String(fd.get('notes') ?? ''),
        },
      });
      setMsg({ ok: true, text: t('addons.requested', { name: item.name }) });
      setOpen(null);
      await load();
      onOrdered?.();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t('addons.orderFailed') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="addons" className="card scroll-mt-24 p-5" aria-labelledby="addons-title">
      <h2 id="addons-title" className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles aria-hidden className="h-5 w-5 text-brand" /> {t('addons.title')}
      </h2>

      {data.orders.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
          {data.orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="flex-1">
                {t('addons.qtyDate', { name: o.addOnName ?? '', qty: o.qty, date: t.date(o.date) })}
                {o.time ? ` ${o.time}` : ''}
              </span>
              <span>{formatMoney(o.amount, o.currency)}</span>
              <span className={`pill ${o.status === 'confirmed' || o.status === 'done' ? 'bg-ok-bg text-ok' : o.status === 'cancelled' ? 'bg-bad-bg text-bad' : 'bg-warn-bg text-warn'}`}>
                {t(`addons.status.${o.status}`)}
              </span>
              {o.rating != null && (
                <span className="text-xs text-muted" aria-label={t('addons.youRated', { n: o.rating })}>
                  {'★'.repeat(o.rating)}
                </span>
              )}
              {o.rating == null && (o.status === 'done' || (o.status === 'confirmed' && o.date <= today())) && (
                <RateOrder reference={reference} token={token} orderId={o.id} name={o.addOnName ?? t('addons.thisExperience')} onRated={load} />
              )}
            </li>
          ))}
        </ul>
      )}

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 rounded-xl p-3 text-sm ${msg.ok ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad'}`}>
          {msg.text}
        </p>
      )}

      {data.canOrder && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.catalogue.map((item) => (
            <li key={item.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{item.name}</p>
                <p className="shrink-0 font-semibold">{formatMoney(item.price, item.currency)}</p>
              </div>
              {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
              {open === item.id ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void order(item, e.currentTarget);
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`d-${item.id}`} className="label">
                        {t('addons.form.date')}
                      </label>
                      <input id={`d-${item.id}`} name="date" type="date" required min={minus1(data.stay.from)} max={data.stay.to} defaultValue={data.stay.from} className="field" />
                    </div>
                    <div>
                      <label htmlFor={`t-${item.id}`} className="label">
                        {t('addons.form.time')} <span className="font-normal text-muted">{t('addons.form.optional')}</span>
                      </label>
                      <input id={`t-${item.id}`} name="time" type="time" className="field" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[6rem_1fr] gap-2">
                    <div>
                      <label htmlFor={`q-${item.id}`} className="label">
                        {t('addons.form.qty')}
                      </label>
                      <input id={`q-${item.id}`} name="qty" type="number" min={1} max={20} defaultValue={1} className="field" />
                    </div>
                    <div>
                      <label htmlFor={`n-${item.id}`} className="label">
                        {t('addons.form.notes')}
                      </label>
                      <input id={`n-${item.id}`} name="notes" maxLength={500} placeholder={t('addons.form.notesHint')} className="field" />
                    </div>
                  </div>
                  {item.leadTimeHours > 0 && <p className="text-xs text-muted">{t('addons.form.leadTime', { hours: item.leadTimeHours })}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary" disabled={busy}>
                      {busy ? t('addons.form.ordering') : t('addons.form.request')}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setOpen(null)}>
                      {t('addons.form.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn-secondary mt-3 min-h-10 px-4" onClick={() => setOpen(item.id)}>
                  {t('addons.form.add')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
