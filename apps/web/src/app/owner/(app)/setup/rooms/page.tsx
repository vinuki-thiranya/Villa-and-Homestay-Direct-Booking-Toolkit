import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import type { Translator } from '@/i18n/owner/t';
import { money } from '@/lib/format';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { createRoomAction, updateRoomAction } from '../../../actions';

function RoomFields({ r, currency, t }: { r?: OwnerRoom; currency: string; t: Translator }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Field label={t('setup.rooms.name')} name="name" required defaultValue={r?.name} className="sm:col-span-2" />
      <Field label={t('setup.rooms.beds')} name="beds" placeholder={t('setup.rooms.bedsPlaceholder')} defaultValue={r?.beds} className="sm:col-span-2" />
      <Field label={t('setup.rooms.baseRate', { currency })} name="baseRate" type="number" min={0} step="0.01" required defaultValue={r?.baseRate} />
      <Field label={t('setup.rooms.extraGuest')} name="extraGuestRate" type="number" min={0} step="0.01" defaultValue={r?.extraGuestRate ?? 0} />
      <Field label={t('setup.rooms.guestsIncluded')} name="baseGuests" type="number" min={1} max={20} required defaultValue={r?.baseGuests ?? 2} />
      <Field label={t('setup.rooms.maxGuests')} name="maxGuests" type="number" min={1} max={20} required defaultValue={r?.maxGuests ?? 2} />
      <Field label={t('setup.rooms.minNights')} name="minNights" type="number" min={1} defaultValue={r?.minNights ?? 1} />
      <Field label={t('setup.rooms.maxNights')} name="maxNights" type="number" min={1} defaultValue={r?.maxNights ?? ''} />
      {/* The values are stored and shown to guests in English; only the labels change. */}
      <Select
        label={t('setup.rooms.bathroom')}
        name="bathroom"
        options={[
          ['Private', t('setup.rooms.bathPrivate')],
          ['Shared', t('setup.rooms.bathShared')],
          ['Ensuite', t('setup.rooms.bathEnsuite')],
        ]}
        defaultValue={r?.bathroom ?? 'Private'}
      />
      <Select
        label={t('setup.rooms.bookingMode')}
        name="bookingMode"
        options={[
          ['', t('setup.rooms.modeDefault')],
          ['instant', t('setup.rooms.modeInstant')],
          ['request', t('setup.rooms.modeRequest')],
        ]}
        defaultValue={r?.bookingMode ?? ''}
      />
      <TextArea label={t('setup.rooms.description')} name="description" defaultValue={r?.description} className="sm:col-span-4" />
      <Field
        label={t('setup.rooms.amenities')}
        name="amenities"
        defaultValue={r?.amenities.join(', ')}
        className="sm:col-span-4"
        placeholder={t('setup.rooms.amenitiesPlaceholder')}
      />
      <TextArea label={t('setup.rooms.photos')} name="photos" defaultValue={r?.photos.join('\n')} className="sm:col-span-4" />
      <Field label={t('setup.rooms.sortOrder')} name="sortOrder" type="number" defaultValue={r?.sortOrder ?? 0} />
      {r && (
        <>
          <input type="hidden" name="activePresent" value="1" />
          <Check label={t('setup.rooms.bookable')} name="active" defaultChecked={r.active} />
        </>
      )}
    </div>
  );
}

export default async function RoomsSetupPage() {
  const property = await currentProperty();
  if (!property) return null;
  const [rooms, t] = await Promise.all([ownerApi<OwnerRoom[]>(`/properties/${property.id}/rooms`), getT()]);
  return (
    <div className="space-y-4">
      {rooms.length === 0 && <Empty>{t('setup.rooms.empty')}</Empty>}
      {rooms.map((r) => (
        <details key={r.id} className="card p-4">
          <summary className="flex cursor-pointer items-center justify-between gap-3">
            <span className="font-semibold">
              {r.name} {!r.active && <span className="pill bg-surface-2 text-muted">{t('setup.rooms.hidden')}</span>}
            </span>
            <span className="text-sm text-muted">
              {money(r.baseRate, property.baseCurrency)}, {t('setup.rooms.upTo', { n: r.maxGuests })}
            </span>
          </summary>
          <div className="mt-4">
            <ActionForm action={updateRoomAction.bind(null, r.id)} submitLabel={t('setup.rooms.save')}>
              <RoomFields r={r} currency={property.baseCurrency} t={t} />
            </ActionForm>
          </div>
        </details>
      ))}
      <Section title={t('setup.rooms.addTitle')}>
        <ActionForm action={createRoomAction.bind(null, property.id)} submitLabel={t('setup.rooms.add')}>
          <RoomFields currency={property.baseCurrency} t={t} />
        </ActionForm>
      </Section>
    </div>
  );
}
