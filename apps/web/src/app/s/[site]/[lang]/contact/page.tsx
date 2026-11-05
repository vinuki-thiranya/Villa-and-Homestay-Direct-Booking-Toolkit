import type { Metadata } from 'next';
import { Mail, MessageCircle } from 'lucide-react';
import { waLink } from '@/lib/format';
import { guestMetadata } from '@/lib/seo';
import { siteContext } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const { property: p, lang, t } = await siteContext();
  return guestMetadata(p, lang, {
    path: '/contact',
    title: t('pages.contact.metaTitle', { name: p.name }),
    description: t('pages.contact.metaDescription', { name: p.name }),
  });
}

export default async function ContactPage() {
  const { property: p, t } = await siteContext();
  const wa = waLink(p.whatsappNumber, t('layout.waText', { name: p.name }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">{t('pages.contact.title', { name: p.name })}</h1>
      <p className="mt-2 text-muted">{t('pages.contact.fastest', { host: p.hostName || t('pages.contact.us') })}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-5 hover:border-brand">
            <MessageCircle aria-hidden className="h-8 w-8 text-[#128c4a]" />
            <span>
              <strong className="block">{t('pages.contact.whatsapp')}</strong>
              <span className="text-sm text-muted">{p.whatsappNumber}</span>
            </span>
          </a>
        )}
        {p.email && (
          <a href={`mailto:${p.email}`} className="card flex items-center gap-4 p-5 hover:border-brand">
            <Mail aria-hidden className="h-8 w-8 text-brand" />
            <span>
              <strong className="block">{t('pages.contact.email')}</strong>
              <span className="text-sm text-muted">{p.email}</span>
            </span>
          </a>
        )}
      </div>
      <p className="mt-8 text-sm text-muted">{p.address}</p>
    </div>
  );
}
