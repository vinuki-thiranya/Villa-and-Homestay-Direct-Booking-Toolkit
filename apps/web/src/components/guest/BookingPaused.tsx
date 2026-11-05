import { waLink } from '@/lib/format';
import { guestT } from '@/lib/site';

export async function BookingPaused({ name, whatsapp }: { name: string; whatsapp: string | null }) {
  const t = await guestT();
  const wa = waLink(whatsapp, t('home.pausedWaText', { name }));
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        <strong>{t('home.paused')}</strong> {t('home.pausedBody')}
      </p>
      {wa && (
        <a href={wa} className="btn-primary" target="_blank" rel="noopener noreferrer">
          {t('home.enquire')}
        </a>
      )}
    </div>
  );
}
