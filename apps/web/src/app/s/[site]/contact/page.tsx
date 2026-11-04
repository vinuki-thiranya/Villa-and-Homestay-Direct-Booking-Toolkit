import type { Metadata } from 'next';
import { Mail, MessageCircle } from 'lucide-react';
import { waLink } from '@/lib/format';
import { canonicalUrl, siteContext } from '@/lib/site';

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { property: p } = await siteContext((await params).site);
  return {
    title: `Contact ${p.name}`,
    description: `Message ${p.name} on WhatsApp or by email about rooms, transfers and availability.`,
    alternates: { canonical: canonicalUrl(p, '/contact') },
  };
}

export default async function ContactPage({ params }: Props) {
  const { property: p } = await siteContext((await params).site);
  const wa = waLink(p.whatsappNumber, `Hello ${p.name}, I have a question about a stay.`);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Contact {p.name}</h1>
      <p className="mt-2 text-muted">The fastest way to reach {p.hostName || 'us'} is WhatsApp.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-5 hover:border-brand">
            <MessageCircle aria-hidden className="h-8 w-8 text-[#128c4a]" />
            <span>
              <strong className="block">WhatsApp</strong>
              <span className="text-sm text-muted">{p.whatsappNumber}</span>
            </span>
          </a>
        )}
        {p.email && (
          <a href={`mailto:${p.email}`} className="card flex items-center gap-4 p-5 hover:border-brand">
            <Mail aria-hidden className="h-8 w-8 text-brand" />
            <span>
              <strong className="block">Email</strong>
              <span className="text-sm text-muted">{p.email}</span>
            </span>
          </a>
        )}
      </div>
      <p className="mt-8 text-sm text-muted">{p.address}</p>
    </div>
  );
}
