import type { Metadata } from 'next';
import { BookingView } from '@/components/guest/BookingView';
import { regionForCurrency } from '@/lib/guest-locale';
import { siteContext } from '@/lib/site';

type Props = {
  params: Promise<{ site: string; reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { t } = await siteContext((await params).site);
  return { title: t('booking.metaTitle'), robots: { index: false, follow: false } };
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { site, reference } = await params;
  const { property: p, base, currency } = await siteContext(site);
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
