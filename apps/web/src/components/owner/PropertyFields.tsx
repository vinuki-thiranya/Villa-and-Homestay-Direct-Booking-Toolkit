import type { OwnerProperty } from '@/lib/owner';
import { Field, Select, TextArea } from './fields';

const TYPES: [string, string][] = [
  ['villa', 'Villa'],
  ['guesthouse', 'Guesthouse'],
  ['homestay', 'Homestay'],
  ['surf_camp', 'Surf camp'],
  ['boutique_hotel', 'Boutique hotel'],
  ['bungalow', 'Bungalow'],
];

/** All property fields; used for onboarding (empty) and the setup page (prefilled). */
export function PropertyFields({ p }: { p?: OwnerProperty }) {
  return (
    <div className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Basics</legend>
        <Field label="Property name" name="name" required minLength={2} defaultValue={p?.name} />
        <Field
          label="Site address"
          name="slug"
          required
          pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
          minLength={3}
          maxLength={40}
          defaultValue={p?.slug}
          hint="villa-name → villa-name.staydirect.lk"
        />
        <Select label="Type" name="type" options={TYPES} defaultValue={p?.type ?? 'villa'} />
        <Field label="Area / town" name="area" placeholder="Mirissa" defaultValue={p?.area} />
        <TextArea label="Description" name="description" rows={4} className="sm:col-span-2" defaultValue={p?.description} />
        <Field label="Address" name="address" className="sm:col-span-2" defaultValue={p?.address} />
        <Field label="Latitude" name="lat" type="number" step="any" defaultValue={p?.lat ?? ''} />
        <Field label="Longitude" name="lng" type="number" step="any" defaultValue={p?.lng ?? ''} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Contact and host</legend>
        <Field label="WhatsApp number" name="whatsappNumber" type="tel" placeholder="+94771234567" defaultValue={p?.whatsappNumber ?? ''} />
        <Field label="Email" name="email" type="email" defaultValue={p?.email ?? ''} />
        <Field label="Host first name" name="hostName" defaultValue={p?.hostName} />
        <Field label="Host photo URL" name="hostPhotoUrl" type="url" defaultValue={p?.hostPhotoUrl ?? ''} />
        <Field label="SLTDA registration no." name="sltdaNumber" defaultValue={p?.sltdaNumber ?? ''} />
        <Field label="SLTDA expiry" name="sltdaExpiry" type="date" defaultValue={p?.sltdaExpiry ?? ''} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Booking rules</legend>
        <Select label="Rates set in" name="baseCurrency" options={[['USD', 'USD'], ['LKR', 'LKR']]} defaultValue={p?.baseCurrency ?? 'USD'} />
        <Field label="Deposit %" name="defaultDepositPct" type="number" min={0} max={100} defaultValue={p?.defaultDepositPct ?? 30} />
        <Select
          label="Cancellation policy"
          name="defaultCancellationPolicy"
          options={[
            ['flexible', 'Flexible — full refund 7+ days'],
            ['moderate', 'Moderate — 50% 14+ days'],
            ['strict', 'Strict — deposit kept'],
          ]}
          defaultValue={p?.defaultCancellationPolicy ?? 'moderate'}
        />
        <Field label="Check-in from" name="checkIn" type="time" defaultValue={p?.checkIn ?? '14:00'} />
        <Field label="Check-out by" name="checkOut" type="time" defaultValue={p?.checkOut ?? '11:00'} />
        <Field label="Tax %" name="taxPct" type="number" min={0} max={50} step="0.01" defaultValue={p?.taxPct ?? 0} />
        <Select
          label="Booking mode"
          name="bookingMode"
          options={[
            ['instant', 'Instant book'],
            ['request', 'Request to book (approve in 12 h)'],
          ]}
          defaultValue={p?.bookingMode ?? 'instant'}
        />
        <Field label="Cleaning gap (nights)" name="cleaningBufferNights" type="number" min={0} max={3} defaultValue={p?.cleaningBufferNights ?? 0} />
        <Field
          label="Hold for bank/QR (hours)"
          name="manualPaymentHoldHours"
          type="number"
          min={1}
          max={72}
          defaultValue={p?.manualPaymentHoldHours ?? 24}
        />
        <TextArea label="House rules" name="houseRules" className="sm:col-span-3" defaultValue={p?.houseRules} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Website</legend>
        <Select
          label="Theme"
          name="theme"
          options={[
            ['lagoon', 'Lagoon (teal)'],
            ['jungle', 'Jungle (green)'],
            ['surf', 'Surf (blue)'],
          ]}
          defaultValue={p?.theme ?? 'lagoon'}
        />
        <Field label="Custom domain" name="customDomain" placeholder="villalagoon.com" defaultValue={p?.customDomain ?? ''} hint="Point a CNAME to cname.vercel-dns.com first" />
        <TextArea label="Photo URLs (one per line, first is the hero)" name="photos" rows={4} className="sm:col-span-2" defaultValue={p?.photos.join('\n')} />
      </fieldset>
    </div>
  );
}
