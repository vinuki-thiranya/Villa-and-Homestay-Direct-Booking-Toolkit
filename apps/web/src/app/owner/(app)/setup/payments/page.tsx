import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Field, Select, TextArea } from '@/components/owner/fields';
import type { Translator } from '@/i18n/owner/t';
import { currentProperty, ownerApi, type OwnerPropertyDetail } from '@/lib/owner';
import { getT } from '@/lib/owner-i18n';
import { saveGatewaysAction } from '../../../actions';

function Status({ on, t }: { on: boolean; t: Translator }) {
  return <span className={`pill ${on ? 'bg-ok-bg text-ok' : 'bg-surface-2 text-muted'}`}>{on ? t('setup.payments.connected') : t('setup.payments.notConnected')}</span>;
}

export default async function PaymentsSetupPage() {
  const current = await currentProperty();
  if (!current) return null;
  const [p, t] = await Promise.all([ownerApi<OwnerPropertyDetail>(`/properties/${current.id}`), getT()]);
  const g = p.gateways;
  const saved = t('setup.payments.saved');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('setup.payments.intro')}</p>
      <div className="card p-5">
        <ActionForm action={saveGatewaysAction.bind(null, p.id)} submitLabel={t('setup.payments.save')}>
          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
            <legend className="flex flex-wrap items-center gap-2 px-1 font-semibold">
              {t('setup.payments.payhere')} <Status on={!!g.payhere} t={t} />
            </legend>
            <Field label={t('setup.payments.merchantId')} name="payhereMerchantId" defaultValue={g.payhere?.merchantId} />
            <Field label={t('setup.payments.merchantSecret')} name="payhereSecret" type="password" autoComplete="off" placeholder={g.payhere ? saved : ''} />
            <Select label={t('setup.payments.chargeIn')} name="payhereCurrency" options={[['LKR', 'LKR'], ['USD', 'USD']]} defaultValue={g.payhere?.currency ?? 'LKR'} />
            {g.payhere && <Check label={t('setup.payments.disconnectPayhere')} name="payhereRemove" />}
            <p className="text-xs text-muted sm:col-span-3">{t('setup.payments.payhereHint')}</p>
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
            <legend className="flex flex-wrap items-center gap-2 px-1 font-semibold">
              {t('setup.payments.paypal')} <Status on={!!g.paypal} t={t} />
            </legend>
            <Field label={t('setup.payments.clientId')} name="paypalClientId" defaultValue={g.paypal?.clientId} />
            <Field label={t('setup.payments.clientSecret')} name="paypalSecret" type="password" autoComplete="off" placeholder={g.paypal ? saved : ''} />
            <Select label={t('setup.payments.chargeIn')} name="paypalCurrency" options={[['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP']]} defaultValue={g.paypal?.currency ?? 'USD'} />
            {g.paypal && <Check label={t('setup.payments.disconnectPaypal')} name="paypalRemove" />}
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
            <legend className="flex flex-wrap items-center gap-2 px-1 font-semibold">
              {t('setup.payments.lankaqr')} <Status on={!!g.lankaqr} t={t} />
            </legend>
            <Field label={t('setup.payments.qrImage')} name="qrImageUrl" type="url" defaultValue={g.lankaqr?.qrImageUrl} hint={t('setup.payments.qrImageHint')} />
            <Field label={t('setup.payments.qrMerchant')} name="qrMerchantName" defaultValue={g.lankaqr?.merchantName} />
            {g.lankaqr && <Check label={t('setup.payments.disconnectLankaqr')} name="lankaqrRemove" />}
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
            <legend className="flex flex-wrap items-center gap-2 px-1 font-semibold">
              {t('setup.payments.bank')} <Status on={!!g.bank} t={t} />
            </legend>
            <Field label={t('setup.payments.accountName')} name="accountName" defaultValue={g.bank?.accountName} />
            <Field label={t('setup.payments.bankName')} name="bankName" defaultValue={g.bank?.bankName} />
            <Field label={t('setup.payments.accountNumber')} name="accountNumber" defaultValue={g.bank?.accountNumber} />
            <Field label={t('setup.payments.branch')} name="branch" defaultValue={g.bank?.branch} />
            <Field label={t('setup.payments.swift')} name="swift" defaultValue={g.bank?.swift} />
            <TextArea label={t('setup.payments.bankNotes')} name="bankNotes" rows={2} defaultValue={g.bank?.notes} />
            {g.bank && <Check label={t('setup.payments.disconnectBank')} name="bankRemove" />}
          </fieldset>
        </ActionForm>
      </div>
    </div>
  );
}
