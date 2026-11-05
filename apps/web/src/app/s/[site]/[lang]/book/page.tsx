import type { Metadata } from 'next';
import { BookingPaused } from '@/components/guest/BookingPaused';
import { BookFlow } from '@/components/guest/BookFlow';
import type { AvailabilityResult } from '@staydirect/shared';
import { apiFetch } from '@/lib/api';
import { guestCurrency, siteContext } from '@/lib/site';

/** Per guest (currency cookie, tokens): never cached. */
export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { property: p, t } = await siteContext();
  return { title: t('book.metaTitle', { property: p.name }), robots: { index: false } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function BookPage({ searchParams }: Props) {
  const [{ property: p, base, siteKey, t }, currency] = await Promise.all([siteContext(), guestCurrency()]);
  const q = await searchParams;
  const from = one(q.from);
  const to = one(q.to);
  const guests = Number(one(q.guests)) || 2;
  const code = one(q.code);
  // Price the first search on the server: step 1 arrives complete, with no shift when results land.
  let initialResult: (AvailabilityResult & { promo: { code: string; pct: number } | null }) | null = null;
  if (from && to && ISO.test(from) && ISO.test(to) && to > from && !p.bookingDisabled) {
    const qs = new URLSearchParams({ from, to, guests: String(guests), currency });
    if (code) qs.set('code', code);
    initialResult = await apiFetch<typeof initialResult>(`/public/sites/${encodeURIComponent(siteKey)}/availability?${qs}`).catch(() => null);
  }
  if (p.bookingDisabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="card p-6">
          <BookingPaused name={p.name} whatsapp={p.whatsappNumber} />
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="g-display text-4xl">{t('book.title')}</h1>
      <BookFlow
        site={siteKey}
        base={base}
        currency={currency}
        property={{
          name: p.name,
          baseCurrency: p.baseCurrency,
          defaultDepositPct: p.defaultDepositPct,
          rooms: p.rooms,
          fx: p.fx,
          paymentMethods: p.paymentMethods,
        }}
        initial={{ from, to, guests, roomId: one(q.room), code }}
        initialResult={initialResult}
      />
    </div>
  );
}
