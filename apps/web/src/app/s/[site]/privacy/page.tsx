import type { Metadata } from 'next';
import { siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p } = await siteContext((await params).site);
  return { title: `Privacy notice — ${p.name}`, robots: { index: false } };
}

export default async function PrivacyPage({ params }: Props) {
  const { property: p } = await siteContext((await params).site);
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
      <h1 className="font-display text-3xl font-semibold">Privacy notice</h1>
      <p className="mt-4">
        {p.name} ({p.address}) is the controller of the personal data you give when you book. The booking system is
        provided by {p.whiteLabel ? 'a technology provider' : 'StayDirect LK'}, which processes the data on {p.name}&apos;s behalf, on servers in Singapore.
      </p>
      <h2 className="mt-6 text-lg font-semibold">What we collect and why</h2>
      <p className="mt-2">
        Your name, email, phone number, country, preferred language, stay dates and any special requests — to take and
        manage your booking, send confirmations and arrival details, and meet Sri Lankan tourism registration rules.
        Card details are entered on the payment provider&apos;s page (PayHere or PayPal) and never reach us.
      </p>
      <h2 className="mt-6 text-lg font-semibold">How long we keep it</h2>
      <p className="mt-2">
        Messages are kept for 24 months. Your identity is anonymised 36 months after your last stay. Financial records
        are kept for 7 years as required by law.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Your rights</h2>
      <p className="mt-2">
        Under the EU GDPR and Sri Lanka&apos;s Personal Data Protection Act you may ask for a copy of your data, correct it,
        or have it deleted (except records we must keep by law). Contact {p.email ?? 'the property'}
        {p.whatsappNumber ? ` or WhatsApp ${p.whatsappNumber}` : ''}.
      </p>
    </article>
  );
}
