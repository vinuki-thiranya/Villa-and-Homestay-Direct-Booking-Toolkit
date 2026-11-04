import { ActionForm } from '@/components/owner/ActionForm';
import { Check, Field, Select, TextArea } from '@/components/owner/fields';
import { currentProperty, ownerApi, type OwnerPropertyDetail } from '@/lib/owner';
import { saveGatewaysAction } from '../../../actions';

function Status({ on }: { on: boolean }) {
  return <span className={`pill ${on ? 'bg-ok-bg text-ok' : 'bg-surface-2 text-muted'}`}>{on ? 'Connected' : 'Not connected'}</span>;
}

export default async function PaymentsSetupPage() {
  const current = await currentProperty();
  if (!current) return null;
  const p = await ownerApi<OwnerPropertyDetail>(`/properties/${current.id}`);
  const g = p.gateways;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Guests pay straight into <strong>your</strong> accounts — StayDirect never holds the money. Secrets are stored encrypted and never shown again;
        leave a secret blank to keep the saved one.
      </p>
      <div className="card p-5">
        <ActionForm action={saveGatewaysAction.bind(null, p.id)} submitLabel="Save payment methods">
          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
            <legend className="flex items-center gap-2 px-1 font-semibold">
              PayHere — cards, Genie, FriMi <Status on={!!g.payhere} />
            </legend>
            <Field label="Merchant ID" name="payhereMerchantId" defaultValue={g.payhere?.merchantId} />
            <Field label="Merchant secret" name="payhereSecret" type="password" autoComplete="off" placeholder={g.payhere ? '•••••• saved' : ''} />
            <Select label="Charge in" name="payhereCurrency" options={[['LKR', 'LKR'], ['USD', 'USD']]} defaultValue={g.payhere?.currency ?? 'LKR'} />
            {g.payhere && <Check label="Disconnect PayHere" name="payhereRemove" />}
            <p className="text-xs text-muted sm:col-span-3">Add this property&apos;s domain in PayHere → Settings → Domains & Credentials to get the secret.</p>
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
            <legend className="flex items-center gap-2 px-1 font-semibold">
              PayPal — international guests <Status on={!!g.paypal} />
            </legend>
            <Field label="Client ID" name="paypalClientId" defaultValue={g.paypal?.clientId} />
            <Field label="Client secret" name="paypalSecret" type="password" autoComplete="off" placeholder={g.paypal ? '•••••• saved' : ''} />
            <Select label="Charge in" name="paypalCurrency" options={[['USD', 'USD'], ['EUR', 'EUR'], ['GBP', 'GBP']]} defaultValue={g.paypal?.currency ?? 'USD'} />
            {g.paypal && <Check label="Disconnect PayPal" name="paypalRemove" />}
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
            <legend className="flex items-center gap-2 px-1 font-semibold">
              LankaQR — UPI for Indian guests <Status on={!!g.lankaqr} />
            </legend>
            <Field label="QR image URL" name="qrImageUrl" type="url" defaultValue={g.lankaqr?.qrImageUrl} hint="Photo of the QR from your bank, uploaded somewhere public" />
            <Field label="Merchant name on the QR" name="qrMerchantName" defaultValue={g.lankaqr?.merchantName} />
            {g.lankaqr && <Check label="Disconnect LankaQR" name="lankaqrRemove" />}
          </fieldset>

          <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
            <legend className="flex items-center gap-2 px-1 font-semibold">
              Bank transfer / Wise <Status on={!!g.bank} />
            </legend>
            <Field label="Account name" name="accountName" defaultValue={g.bank?.accountName} />
            <Field label="Bank" name="bankName" defaultValue={g.bank?.bankName} />
            <Field label="Account number" name="accountNumber" defaultValue={g.bank?.accountNumber} />
            <Field label="Branch" name="branch" defaultValue={g.bank?.branch} />
            <Field label="SWIFT" name="swift" defaultValue={g.bank?.swift} />
            <TextArea label="Notes for the guest" name="bankNotes" rows={2} defaultValue={g.bank?.notes} />
            {g.bank && <Check label="Disconnect bank transfer" name="bankRemove" />}
          </fieldset>
        </ActionForm>
      </div>
    </div>
  );
}
