import type { Metadata } from 'next';
import { BookingPaused } from '@/components/guest/BookingPaused';
import { BookFlow } from '@/components/guest/BookFlow';
import { siteContext } from '@/lib/site';

type Props = {
  params: Promise<{ site: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p } = await siteContext((await params).site);
  return { title: `Book ${p.name} — best price direct`, robots: { index: false } };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BookPage({ params, searchParams }: Props) {
  const { property: p, base, currency, siteKey } = await siteContext((await params).site);
  const q = await searchParams;
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
      <h1 className="font-display text-3xl font-semibold">Book your stay</h1>
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
        initial={{
          from: one(q.from),
          to: one(q.to),
          guests: Number(one(q.guests)) || 2,
          roomId: one(q.room),
        }}
      />
    </div>
  );
}
