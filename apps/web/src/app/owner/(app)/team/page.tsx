import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Check, Empty, Field, Section, Select } from '@/components/owner/fields';
import { fmtDate } from '@/lib/format';
import { listProperties } from '@/lib/owner';
import { getMe, ownerTry, type TeamData } from '@/lib/owner-r3';
import { inviteAction, removeMemberAction, revokeInviteAction, updateMemberAction } from '../../actions-r3';

export const metadata = { title: 'Team' };

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };
const ROLES: [string, string][] = [
  ['manager', 'Manager — bookings, payments, guests'],
  ['staff', 'Staff — tasks and inbox'],
];

/** Team members and their property access (spec §5: manager invites by link). */
export default async function TeamPage() {
  const me = await getMe();
  const [res, properties] = await Promise.all([ownerTry<TeamData>('/team'), listProperties()]);
  const team = res.data ?? { members: [], invites: [] };
  const isOwner = me.user.role === 'owner';
  const propName = new Map(properties.map((p) => [p.id, p.name]));
  const access = (ids: string[]) => (ids.length === 0 ? 'All properties' : ids.map((id) => propName.get(id) ?? 'Property').join(', '));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Team</h1>
      <Section title={`People (${team.members.length})`}>
        <ul className="divide-y divide-line">
          {team.members.map((m) => (
            <li key={m.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{m.name || m.phone}</p>
                <span className="pill bg-surface-2 text-muted">{ROLE_LABEL[m.role]}</span>
                <span className="text-sm text-muted">{m.phone}</span>
              </div>
              <p className="text-sm text-muted">{m.role === 'owner' ? 'Everything' : access(m.propertyIds)}</p>
              {isOwner && m.role !== 'owner' && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-brand">Change access</summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={updateMemberAction.bind(null, m.id)} submitLabel="Save access">
                      <Select label="Role" name="role" id={`role-${m.id}`} options={ROLES} defaultValue={m.role} className="max-w-sm" />
                      <PropertyChecks properties={properties} selected={m.propertyIds} />
                    </ActionForm>
                    <ActionForm action={removeMemberAction.bind(null, m.id)} submitLabel="Remove from team" variant="danger" confirm={`Remove ${m.name} from your team?`} />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {team.invites.length > 0 && (
        <Section title="Invites waiting">
          <ul className="divide-y divide-line">
            {team.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {i.name} <span className="text-muted">· {i.phone} · {ROLE_LABEL[i.role]}</span>
                  </p>
                  <p className="text-muted">
                    {access(i.propertyIds)} · expires {fmtDate(i.expiresAt.slice(0, 10))}
                  </p>
                </div>
                <CopyButton text={i.url} label="Copy link" />
                {isOwner && <ActionForm action={revokeInviteAction.bind(null, i.id)} submitLabel="Revoke" variant="secondary" inline />}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {isOwner ? (
        <Section title="Invite someone">
          <p className="mb-3 text-sm text-muted">They get a link by WhatsApp or SMS and sign in with their own phone number. No password.</p>
          <ActionForm action={inviteAction} submitLabel="Send invite">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" name="name" required autoComplete="off" />
              <Field label="Mobile number" name="phone" type="tel" required placeholder="077 123 4567" />
              <Select label="Role" name="role" options={ROLES} />
            </div>
            <PropertyChecks properties={properties} selected={[]} />
          </ActionForm>
        </Section>
      ) : (
        <Empty>Only the owner can invite people or change access.</Empty>
      )}
    </div>
  );
}

function PropertyChecks({ properties, selected }: { properties: { id: string; name: string }[]; selected: string[] }) {
  if (properties.length <= 1) return null;
  return (
    <fieldset className="rounded-xl border border-line p-3">
      <legend className="px-1 text-sm font-semibold">Properties (none ticked = all)</legend>
      <div className="flex flex-wrap gap-x-4">
        {properties.map((p) => (
          <Check key={p.id} label={p.name} name="propertyIds" value={p.id} defaultChecked={selected.includes(p.id)} />
        ))}
      </div>
    </fieldset>
  );
}
