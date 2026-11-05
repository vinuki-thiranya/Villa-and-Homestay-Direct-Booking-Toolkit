import { ActionForm } from '@/components/owner/ActionForm';
import { CopyButton } from '@/components/owner/CopyButton';
import { Check, Empty, Field, Section, Select } from '@/components/owner/fields';
import type { Translator } from '@/i18n/owner/t';
import { listProperties } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { getMe, ownerTry, type TeamData } from '@/lib/owner-r3';
import { inviteAction, removeMemberAction, revokeInviteAction, updateMemberAction } from '../../actions-r3';

export async function generateMetadata() {
  return { title: (await getT())('team.title') };
}

const roleLabel = (t: Translator, role: string) => (role === 'owner' || role === 'manager' || role === 'staff' ? t(`team.roles.${role}`) : role);

/** Team members and their property access (spec §5: manager invites by link). */
export default async function TeamPage() {
  const [me, res, properties, t] = await Promise.all([getMe(), ownerTry<TeamData>('/team'), listProperties(), getT()]);
  const team = res.data ?? { members: [], invites: [] };
  const isOwner = me.user.role === 'owner';
  const propName = new Map(properties.map((p) => [p.id, p.name]));
  const access = (ids: string[]) => (ids.length === 0 ? t('team.allProperties') : ids.map((id) => propName.get(id) ?? t('team.property')).join(', '));
  const roles: [string, string][] = [
    ['manager', t('team.roleManager')],
    ['staff', t('team.roleStaff')],
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t('team.title')}</h1>
      <Section title={t('team.people', { n: team.members.length })}>
        <ul className="divide-y divide-line">
          {team.members.map((m) => (
            <li key={m.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{m.name || m.phone}</p>
                <span className="pill bg-surface-2 text-muted">{roleLabel(t, m.role)}</span>
                <span className="text-sm text-muted">{m.phone}</span>
              </div>
              <p className="text-sm text-muted">{m.role === 'owner' ? t('team.everything') : access(m.propertyIds)}</p>
              {isOwner && m.role !== 'owner' && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-brand">{t('team.changeAccess')}</summary>
                  <div className="mt-3 space-y-3">
                    <ActionForm action={updateMemberAction.bind(null, m.id)} submitLabel={t('team.saveAccess')}>
                      <Select label={t('team.role')} name="role" id={`role-${m.id}`} options={roles} defaultValue={m.role} className="max-w-sm" />
                      <PropertyChecks properties={properties} selected={m.propertyIds} t={t} />
                    </ActionForm>
                    <ActionForm
                      action={removeMemberAction.bind(null, m.id)}
                      submitLabel={t('team.remove')}
                      variant="danger"
                      confirm={t('team.removeConfirm', { name: m.name })}
                    />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {team.invites.length > 0 && (
        <Section title={t('team.invitesTitle')}>
          <ul className="divide-y divide-line">
            {team.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {i.name}{' '}
                    <span className="text-muted">
                      {i.phone}, {roleLabel(t, i.role)}
                    </span>
                  </p>
                  <p className="text-muted">{t('team.expires', { access: access(i.propertyIds), date: t.date(i.expiresAt.slice(0, 10)) })}</p>
                </div>
                <CopyButton text={i.url} label={t('team.copyLink')} />
                {isOwner && <ActionForm action={revokeInviteAction.bind(null, i.id)} submitLabel={t('team.revoke')} variant="secondary" inline />}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {isOwner ? (
        <Section title={t('team.inviteTitle')}>
          <p className="mb-3 text-sm text-muted">{t('team.inviteIntro')}</p>
          <ActionForm action={inviteAction} submitLabel={t('team.sendInvite')}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('team.name')} name="name" required autoComplete="off" />
              <Field label={t('team.mobile')} name="phone" type="tel" required placeholder="077 123 4567" />
              <Select label={t('team.role')} name="role" options={roles} />
            </div>
            <PropertyChecks properties={properties} selected={[]} t={t} />
          </ActionForm>
        </Section>
      ) : (
        <Empty>{t('team.ownerOnly')}</Empty>
      )}
    </div>
  );
}

function PropertyChecks({ properties, selected, t }: { properties: { id: string; name: string }[]; selected: string[]; t: Translator }) {
  if (properties.length <= 1) return null;
  return (
    <fieldset className="rounded-xl border border-line p-3">
      <legend className="px-1 text-sm font-semibold">{t('team.propertiesLegend')}</legend>
      <div className="flex flex-wrap gap-x-4">
        {properties.map((p) => (
          <Check key={p.id} label={p.name} name="propertyIds" value={p.id} defaultChecked={selected.includes(p.id)} />
        ))}
      </div>
    </fieldset>
  );
}
