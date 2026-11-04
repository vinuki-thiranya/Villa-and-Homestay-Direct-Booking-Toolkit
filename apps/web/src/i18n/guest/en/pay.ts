// Guest site text: choosing how to pay, LankaQR and bank details, slip upload.
export const pay = {
  heading: 'How would you like to pay?',
  dueNow: 'Due now: {amount}',
  chargedIn: '({approx}). You are charged in {currency}; your bank or card sets the final rate.',
  notSetUp: 'Online payment is not set up yet. The host will contact you on WhatsApp to arrange the deposit.',
  somewhereElse: 'Paying from somewhere else?',
  preparing: 'Preparing secure payment…',
  startFailed: 'Could not start the payment',
  direct: 'You pay {property} directly. Card details are entered on the payment provider’s page and never reach this site.',
  groups: {
    abroad: 'Paying from abroad',
    india: 'Paying from India',
    sri_lanka: 'Paying in Sri Lanka',
  },
  options: {
    abroad: {
      payhere: { title: 'Card', detail: 'Visa or Mastercard on the secure PayHere page' },
      paypal: { title: 'PayPal', detail: 'Your PayPal balance or any card, in USD, EUR or GBP' },
      bank: { title: 'Bank transfer or Wise', detail: 'Transfer, then upload the slip; the host confirms' },
    },
    india: {
      lankaqr: { title: 'UPI', detail: 'Scan the LankaQR code with GPay, PhonePe or Paytm' },
      payhere: { title: 'Card', detail: 'Visa or Mastercard on the secure PayHere page' },
    },
    sri_lanka: {
      payhere: { title: 'Card, Genie or FriMi', detail: 'Sri Lankan cards and wallets on PayHere' },
      lankaqr: { title: 'LankaQR', detail: 'Scan with any Sri Lankan banking app' },
      bank: { title: 'Bank transfer', detail: 'Transfer, then upload the slip; the host confirms' },
    },
  },
  qr: {
    alt: 'LankaQR code for {merchant}',
    scan: 'Scan with any UPI or Sri Lankan banking app and pay exactly {amount} to {merchant}.',
    note: 'Put {reference} in the payment note.',
    held: 'Your dates are held until {time}. Upload the payment screenshot below so the host can confirm.',
  },
  bank: {
    accountName: 'Account name',
    bank: 'Bank',
    accountNumber: 'Account number',
    branch: 'Branch',
    amount: 'Amount',
    reference: 'Reference',
    held: 'Your dates are held until {time}.',
  },
  paypal: {
    amount: 'Amount: {amount}',
    loadFailed: 'Could not load PayPal',
    captureFailed: 'PayPal payment could not be completed',
    error: 'PayPal reported an error. Please try again or choose another method.',
  },
  slip: {
    label: 'Payment slip or screenshot (JPG, PNG, PDF, up to 5 MB)',
    upload: 'Upload slip',
    uploading: 'Uploading…',
    failed: 'Upload failed',
    received: 'Thanks, slip received. The host will confirm your booking shortly and you will get an email.',
  },
};
