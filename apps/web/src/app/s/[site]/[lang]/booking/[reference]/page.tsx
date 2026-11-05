import type { Metadata } from 'next';
import { BookingView } from '@/components/guest/BookingView';
import { regionForCurrency } from '@/lib/guest-locale';
import { guestCurrency, siteContext } from '@/lib/site';

/** Per guest (currency cookie, tokens): never cached. */
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await siteContext();
  return { title: t('booking.metaTitle'), robots: { index: false, follow: false } };
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { reference } = await params;
  const [{ property: p, base }, currency] = await Promise.all([siteContext(), guestCurrency()]);
  const q = await searchParams;
  const token = typeof q.t === 'string' ? q.t : '';
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookingView
        reference={decodeURIComponent(reference)}
        token={token}
        base={base}
        returnedFromPayment={q.paid === '1'}
        propertyName={p.name}
        paypalClientId={p.paypalClientId}
        region={regionForCurrency(currency)}
        display={{ currency, fx: p.fx }}
        mapQuery={p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : p.address || null}
      />
    </div>
  );
}
