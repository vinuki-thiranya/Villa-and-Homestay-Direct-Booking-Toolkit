import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { LanguageSwitch } from '@/components/owner/LanguageSwitch';
import { hiddenNav, NAV_ITEMS } from '@/components/owner/nav-items';
import { listProperties } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { getMe } from '@/lib/owner-r3';

export async function generateMetadata() {
  return { title: (await getT())('nav.more') };
}

/** Phone-only overflow menu for the sections that are not in the bottom bar, and the language. */
export default async function MorePage() {
  const [me, properties, t] = await Promise.all([getMe(), listProperties(), getT()]);
  const hidden = hiddenNav({ role: me.user.role, properties: properties.length, flags: me.flags });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('nav.more')}</h1>
      <ul className="card divide-y divide-line">
        {NAV_ITEMS.slice(4)
          .filter((i) => !hidden.includes(i.href))
          .map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 px-4 text-base font-medium hover:bg-surface-2">
                <Icon aria-hidden className="h-5 w-5 text-brand" />
                <span className="flex-1">{t(`nav.${key}`)}</span>
                <ChevronRight aria-hidden className="h-5 w-5 text-muted" />
              </Link>
            </li>
          ))}
      </ul>
      <section aria-labelledby="lang-h" className="space-y-3">
        <h2 id="lang-h" className="text-lg font-semibold">
          {t('common.language')}
        </h2>
        <LanguageSwitch lang={t.lang} />
      </section>
    </div>
  );
}
