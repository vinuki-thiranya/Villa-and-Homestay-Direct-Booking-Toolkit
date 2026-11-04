import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Empty, Field, Section, Select, TextArea } from '@/components/owner/fields';
import { money } from '@/lib/format';
import { currentProperty, ownerApi, type OwnerRoom } from '@/lib/owner';
import { createRoomAction, updateRoomAction } from '../../../actions';

function RoomFields({ r, currency }: { r?: OwnerRoom; currency: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Field label="Room name" name="name" required defaultValue={r?.name} className="sm:col-span-2" />
      <Field label="Beds" name="beds" placeholder="1 king bed" defaultValue={r?.beds} className="sm:col-span-2" />
      <Field label={`Base rate (${currency}/night)`} name="baseRate" type="number" min={0} step="0.01" required defaultValue={r?.baseRate} />
      <Field label="Extra guest / night" name="extraGuestRate" type="number" min={0} step="0.01" defaultValue={r?.extraGuestRate ?? 0} />
      <Field label="Guests included" name="baseGuests" type="number" min={1} max={20} required defaultValue={r?.baseGuests ?? 2} />
      <Field label="Max guests" name="maxGuests" type="number" min={1} max={20} required defaultValue={r?.maxGuests ?? 2} />
      <Field label="Min nights" name="minNights" type="number" min={1} defaultValue={r?.minNights ?? 1} />
      <Field label="Max nights" name="maxNights" type="number" min={1} defaultValue={r?.maxNights ?? ''} />
      <Select label="Bathroom" name="bathroom" options={[['Private', 'Private'], ['Shared', 'Shared'], ['Ensuite', 'Ensuite']]} defaultValue={r?.bathroom ?? 'Private'} />
      <Select
        label="Booking mode"
        name="bookingMode"
        options={[
          ['', 'Property default'],
          ['instant', 'Instant'],
          ['request', 'Request to book'],
        ]}
        defaultValue={r?.bookingMode ?? ''}
      />
      <TextArea label="Description" name="description" defaultValue={r?.description} className="sm:col-span-4" />
      <Field label="Amenities (comma separated)" name="amenities" defaultValue={r?.amenities.join(', ')} className="sm:col-span-4" placeholder="Air conditioning, Hot water, Ocean view" />
      <TextArea label="Photo URLs (one per line)" name="photos" defaultValue={r?.photos.join('\n')} className="sm:col-span-4" />
      <Field label="Sort order" name="sortOrder" type="number" defaultValue={r?.sortOrder ?? 0} />
      {r && (
        <>
          <input type="hidden" name="activePresent" value="1" />
          <Check label="Bookable" name="active" defaultChecked={r.active} />
        </>
      )}
    </div>
  );
}

export default async function RoomsSetupPage() {
  const property = await currentProperty();
  if (!property) return null;
  const rooms = await ownerApi<OwnerRoom[]>(`/properties/${property.id}/rooms`);
  return (
    <div className="space-y-4">
      {rooms.length === 0 && <Empty>No rooms yet. Add your first room below.</Empty>}
      {rooms.map((r) => (
        <details key={r.id} className="card p-4">
          <summary className="flex cursor-pointer items-center justify-between gap-3">
            <span className="font-semibold">
              {r.name} {!r.active && <span className="pill bg-surface-2 text-muted">hidden</span>}
            </span>
            <span className="text-sm text-muted">
              {money(r.baseRate, property.baseCurrency)} · up to {r.maxGuests}
            </span>
          </summary>
          <div className="mt-4">
            <ActionForm action={updateRoomAction.bind(null, r.id)} submitLabel="Save room">
              <RoomFields r={r} currency={property.baseCurrency} />
            </ActionForm>
          </div>
        </details>
      ))}
      <Section title="Add a room">
        <ActionForm action={createRoomAction.bind(null, property.id)} submitLabel="Add room">
          <RoomFields currency={property.baseCurrency} />
        </ActionForm>
      </Section>
    </div>
  );
}
