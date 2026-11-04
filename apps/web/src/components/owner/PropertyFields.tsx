import type { OwnerProperty } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { Field, Select, TextArea } from './fields';

const TYPES = ['villa', 'guesthouse', 'homestay', 'surf_camp', 'boutique_hotel', 'bungalow'] as const;

/** All property fields; used for onboarding (empty) and the setup page (prefilled). */
export async function PropertyFields({ p }: { p?: OwnerProperty }) {
  const t = await getT();
  return (
    <div className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t('property.basics')}</legend>
        <Field label={t('property.name')} name="name" required minLength={2} defaultValue={p?.name} />
        <Field
          label={t('property.slug')}
          name="slug"
          required
          pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
          minLength={3}
          maxLength={40}
          defaultValue={p?.slug}
          hint={t('property.slugHint')}
        />
        <Select label={t('property.type')} name="type" options={TYPES.map((k) => [k, t(`property.types.${k}`)] as [string, string])} defaultValue={p?.type ?? 'villa'} />
        <Field label={t('property.area')} name="area" placeholder={t('property.areaPlaceholder')} defaultValue={p?.area} />
        <TextArea label={t('property.description')} name="description" rows={4} className="sm:col-span-2" defaultValue={p?.description} />
        <Field label={t('property.address')} name="address" className="sm:col-span-2" defaultValue={p?.address} />
        <Field label={t('property.lat')} name="lat" type="number" step="any" defaultValue={p?.lat ?? ''} />
        <Field label={t('property.lng')} name="lng" type="number" step="any" defaultValue={p?.lng ?? ''} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t('property.contact')}</legend>
        <Field label={t('property.whatsapp')} name="whatsappNumber" type="tel" placeholder="+94771234567" defaultValue={p?.whatsappNumber ?? ''} />
        <Field label={t('property.email')} name="email" type="email" defaultValue={p?.email ?? ''} />
        <Field label={t('property.hostName')} name="hostName" defaultValue={p?.hostName} />
        <Field label={t('property.hostPhoto')} name="hostPhotoUrl" type="url" defaultValue={p?.hostPhotoUrl ?? ''} />
        <Field label={t('property.sltdaNumber')} name="sltdaNumber" defaultValue={p?.sltdaNumber ?? ''} />
        <Field label={t('property.sltdaExpiry')} name="sltdaExpiry" type="date" defaultValue={p?.sltdaExpiry ?? ''} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t('property.rules')}</legend>
        <Select label={t('property.currency')} name="baseCurrency" options={[['USD', 'USD'], ['LKR', 'LKR']]} defaultValue={p?.baseCurrency ?? 'USD'} />
        <Field label={t('property.depositPct')} name="defaultDepositPct" type="number" min={0} max={100} defaultValue={p?.defaultDepositPct ?? 30} />
        <Select
          label={t('property.cancellation')}
          name="defaultCancellationPolicy"
          options={[
            ['flexible', t('property.cancelFlexible')],
            ['moderate', t('property.cancelModerate')],
            ['strict', t('property.cancelStrict')],
          ]}
          defaultValue={p?.defaultCancellationPolicy ?? 'moderate'}
        />
        <Field label={t('property.checkIn')} name="checkIn" type="time" defaultValue={p?.checkIn ?? '14:00'} />
        <Field label={t('property.checkOut')} name="checkOut" type="time" defaultValue={p?.checkOut ?? '11:00'} />
        <Field label={t('property.taxPct')} name="taxPct" type="number" min={0} max={50} step="0.01" defaultValue={p?.taxPct ?? 0} />
        <Select
          label={t('property.bookingMode')}
          name="bookingMode"
          options={[
            ['instant', t('property.modeInstant')],
            ['request', t('property.modeRequest')],
          ]}
          defaultValue={p?.bookingMode ?? 'instant'}
        />
        <Field label={t('property.cleaningGap')} name="cleaningBufferNights" type="number" min={0} max={3} defaultValue={p?.cleaningBufferNights ?? 0} />
        <Field label={t('property.holdHours')} name="manualPaymentHoldHours" type="number" min={1} max={72} defaultValue={p?.manualPaymentHoldHours ?? 24} />
        <TextArea label={t('property.houseRules')} name="houseRules" className="sm:col-span-3" defaultValue={p?.houseRules} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t('property.website')}</legend>
        <Select
          label={t('property.theme')}
          name="theme"
          options={[
            ['lagoon', t('property.themeLagoon')],
            ['jungle', t('property.themeJungle')],
            ['surf', t('property.themeSurf')],
          ]}
          defaultValue={p?.theme ?? 'lagoon'}
        />
        <Field label={t('property.customDomain')} name="customDomain" placeholder="villalagoon.com" defaultValue={p?.customDomain ?? ''} hint={t('property.customDomainHint')} />
        <TextArea label={t('property.photos')} name="photos" rows={4} className="sm:col-span-2" defaultValue={p?.photos.join('\n')} />
        <Field
          label={t('property.heroVideo')}
          name="heroVideoUrl"
          type="url"
          className="sm:col-span-2"
          placeholder="https://…/drone-loop.mp4"
          defaultValue={p?.heroVideoUrl ?? ''}
          hint={t('property.heroVideoHint')}
        />
      </fieldset>
    </div>
  );
}
