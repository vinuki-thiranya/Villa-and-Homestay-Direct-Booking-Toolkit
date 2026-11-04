import { BrandForm } from '@/components/owner/BrandForm';
import { UpgradeNote } from '@/components/owner/Upgrade';
import { currentProperty } from '@/lib/owner';
import { getMe, ownerTry, type Brand } from '@/lib/owner-r3';

export const metadata = { title: 'Branding' };

/** White label (Manager plan): your brand on guest sites, emails and statements instead of ours. */
export default async function BrandingPage() {
  const me = await getMe();
  if (!me.flags.white_label) return <UpgradeNote feature="white_label" />;
  const [property, res] = await Promise.all([currentProperty(), ownerTry<Brand>('/brand')]);
  if (!res.data) return <UpgradeNote feature="white_label" message={res.error.message} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Guest sites, booking emails, invoices and owner statements show your brand. &ldquo;Powered by StayDirect&rdquo; is removed everywhere.
      </p>
      <BrandForm brand={res.data} propertyName={property?.name ?? 'Your property'} />
    </div>
  );
}
