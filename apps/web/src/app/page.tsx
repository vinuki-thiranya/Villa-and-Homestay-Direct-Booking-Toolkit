import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarSync, CreditCard, Globe, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'StayDirect LK — direct booking software for guesthouses and villas in Sri Lanka',
  description:
    'A Booking.com commission alternative for Sri Lankan villas and homestays: your own booking site, calendar sync with Airbnb and Booking.com, deposits by PayHere, PayPal and LankaQR.',
};

const FEATURES = [
  { icon: Globe, title: 'Your own booking site', body: 'villa-name.staydirect.lk or your own domain, live in 20 minutes. Fast on a 4G phone in Europe or India.' },
  { icon: CalendarSync, title: 'No more double bookings', body: 'Airbnb, Booking.com, Agoda and Vrbo calendars sync every 15 minutes. Clashes alert you on WhatsApp.' },
  { icon: CreditCard, title: 'Deposits in LKR or USD', body: 'PayHere cards and wallets, PayPal, UPI via LankaQR and bank slips — paid straight into your account.' },
  { icon: MessageCircle, title: 'WhatsApp-first', body: 'Confirmations with directions in English, German, French and Hindi. Your guests already live on WhatsApp.' },
  { icon: ShieldCheck, title: 'Never sells a night twice', body: 'The database itself refuses a second sale of any night — direct, Airbnb or Booking.com.' },
  { icon: Sparkles, title: 'See what you saved', body: 'Every month: occupancy, revenue by channel and the OTA commission you kept.' },
];

const PLANS = [
  { name: 'Basic', price: '5,000', pct: '2.5%', who: '1 property, up to 5 rooms', items: ['Booking site', 'Calendar + iCal sync', 'Deposits', 'WhatsApp quick replies', 'Reports'] },
  { name: 'Pro', price: '10,000', pct: '2.5%', who: '1 property, up to 15 rooms', items: ['Everything in Basic', 'AI concierge', 'Housekeeping board', 'Add-on marketplace', 'Reviews + guest CRM'], featured: true },
  { name: 'Pro Multi', price: '15,000', extra: '+ 5,000 per extra property', pct: '2.0%', who: 'Up to 5 properties', items: ['Everything in Pro', 'Multi-property calendar', 'Manager accounts', 'Consolidated reports'] },
  { name: 'Manager', price: '25,000', extra: '+ 3,000 per managed property', pct: '1.5%', who: 'Unlimited properties', items: ['Everything in Pro Multi', 'Per-owner statements', 'Payout calculation', 'White-label guest sites'] },
];

const FAQ = [
  ['Do I have to leave Booking.com or Airbnb?', 'No. Keep them for new guests. StayDirect syncs your calendars and moves repeat and referral guests to your own site, where you keep the 15%.'],
  ['Who holds the guest’s money?', 'You do. PayHere, PayPal and LankaQR are connected to your own merchant accounts; deposits go straight to your bank.'],
  ['What if I have a quiet month?', 'Choose the percentage plan: 2.5% of direct bookings and no monthly fee, so a dead month costs nothing.'],
  ['How long does setup take?', 'About an hour at your property: photos, rooms and rates, calendar links pasted into Airbnb and Booking.com, and a test deposit.'],
  ['Can Indian guests pay with UPI?', 'Yes — LankaQR accepts UPI from GPay, PhonePe and Paytm. Fee-free under LKR 5,000.'],
];

export default function Marketing() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  return (
    <div data-theme="lagoon" className="bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="font-display text-xl font-semibold">
          StayDirect <span className="text-brand">LK</span>
        </span>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm font-medium">
          <a href="#pricing" className="hidden hover:text-brand sm:inline">
            Pricing
          </a>
          <Link href="/owner/login" className="btn-secondary min-h-9 px-4">
            Owner login
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-20">
          <p className="pill bg-brand/10 text-brand">For villas, guesthouses, homestays and surf camps</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">Keep the 15% you pay Booking.com.</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Your own site, your own calendar, your WhatsApp answered. Direct bookings cost a 2.5–3% gateway fee instead of 15–18% commission.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/s/villa-lagoon" className="btn-primary">
              See a live guest site
            </Link>
            <Link href="/owner/login" className="btn-secondary">
              Start free for 3 months
            </Link>
          </div>
        </section>

        <section className="bg-surface-2/70" aria-labelledby="features">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 id="features" className="font-display text-3xl font-semibold">
              Everything a 2–15 room property needs
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="card p-6">
                  <Icon aria-hidden className="h-6 w-6 text-brand" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="pricing-h">
          <h2 id="pricing-h" className="font-display text-3xl font-semibold">
            Pricing in rupees
          </h2>
          <p className="mt-2 text-muted">Monthly, or a percentage of direct bookings instead. Annual plans: 2 months free. Add-ons: 10% of each one sold.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.name} className={`card flex flex-col p-6 ${p.featured ? 'border-brand ring-2 ring-brand/20' : ''}`}>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-3">
                  <span className="text-3xl font-semibold">LKR {p.price}</span>
                  <span className="text-sm text-muted"> /month</span>
                </p>
                {p.extra && <p className="text-sm text-muted">{p.extra}</p>}
                <p className="mt-1 text-sm text-muted">or {p.pct} of direct bookings</p>
                <p className="mt-4 text-sm font-medium">{p.who}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted">
                  {p.items.map((i) => (
                    <li key={i}>✓ {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface-2/70" aria-labelledby="faq">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 id="faq" className="font-display text-3xl font-semibold">
              Questions owners ask
            </h2>
            <div className="mt-6 space-y-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="card p-5">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="mt-2 text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
        StayDirect LK · Made for Mirissa, Weligama, Ella, Arugam Bay, Kandy and Sigiriya.
      </footer>
    </div>
  );
}
