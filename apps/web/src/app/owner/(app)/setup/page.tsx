import { ExternalLink } from 'lucide-react';
import { ActionForm } from '@/components/owner/ActionForm';
import { PropertyFields } from '@/components/owner/PropertyFields';
import { currentProperty, ownerApi, type OwnerPropertyDetail } from '@/lib/owner';
import { updatePropertyAction } from '../../actions';

export default async function PropertySetupPage() {
  const current = await currentProperty();
  if (!current) return null;
  const p = await ownerApi<OwnerPropertyDetail>(`/properties/${current.id}`);
  return (
    <div className="space-y-4">
      <a href={p.siteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-brand">
        View your guest site <ExternalLink aria-hidden className="h-4 w-4" />
      </a>
      <div className="card p-5">
        <ActionForm action={updatePropertyAction.bind(null, p.id)} submitLabel="Save changes">
          <PropertyFields p={p} />
        </ActionForm>
      </div>
    </div>
  );
}
