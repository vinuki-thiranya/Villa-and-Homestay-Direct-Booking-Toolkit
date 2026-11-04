import { BrandForm } from '@/components/owner/BrandForm';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { currentProperty } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { getMe, ownerTry, type Brand } from '@/lib/owner-r3';

export async function generateMetadata() {
  return { title: (await getT())('brand.metaTitle') };
}

/** White label (Manager plan): your brand on guest sites, emails and statements instead of ours. */
export default async function BrandingPage() {
  const me = await getMe();
  if (!me.flags.white_label) return <UpgradeNote feature="white_label" />;
  const [property, res, t] = await Promise.all([currentProperty(), ownerTry<Brand>('/brand'), getT()]);
  if (!res.data) return <UpgradeNote feature="white_label" message={res.error.message} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('brand.intro')}</p>
      <BrandForm brand={res.data} propertyName={property?.name ?? t('brand.yourProperty')} />
    </div>
  );
}
