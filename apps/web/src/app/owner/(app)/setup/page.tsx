import { ExternalLink } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { PropertyFields } from '@/components/owner/PropertyFields';
import { currentProperty, ownerApi, type OwnerPropertyDetail } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { updatePropertyAction } from '../../actions';

export default async function PropertySetupPage() {
  const current = await currentProperty();
  if (!current) return null;
  const [p, t] = await Promise.all([ownerApi<OwnerPropertyDetail>(`/properties/${current.id}`), getT()]);
  return (
    <div className="space-y-4">
      <a href={p.siteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand">
        {t('property.viewSite')} <ExternalLink aria-hidden className="h-4 w-4" />
      </a>
      <div className="card p-5">
        <ActionForm action={updatePropertyAction.bind(null, p.id)} submitLabel={t('property.saveChanges')}>
          <PropertyFields p={p} />
        </ActionForm>
      </div>
    </div>
  );
}
