# Manual Launch Checklist

## Homepage

- Open `https://docready.co.za`
- Confirm the homepage says South Africa only
- Confirm the homepage says files are processed in the browser
- Confirm the homepage says DocReady is not affiliated with SARS
- Confirm only two paid plans are shown:
  - Taxpayer Pass: R49 once-off
  - Practitioner Pass: R399 once-off

## Legal pages

- Open `/terms`
- Open `/privacy`
- Open `/refunds`
- Open `/contact`
- Open `/popia`
- Open `/paia`
- Confirm the PAIA page is clearly marked as a placeholder pending final replacement

## File processing

- Open the workspace as a taxpayer
- Add one PDF and one JPG or PNG
- Run `Merge only (no compression)`
- Confirm a merged PDF is produced
- Confirm no document upload is sent to the backend
- In strict upload mode, run `Prepare Strict Upload Output`
- Confirm the receipt appears and warns that acceptance is not guaranteed

## Payment success

- Start checkout from the pricing modal
- Confirm the backend creates a pending transaction
- Complete payment in Paystack
- Confirm the webhook is received once or more without double-granting access
- Confirm the entitlement becomes active only after valid verification

## Payment failure

- Start checkout
- Fail the payment in Paystack
- Confirm the transaction status becomes `failed`
- Confirm no entitlement is granted

## Abandoned payment

- Start checkout
- Leave checkout without paying
- Confirm the transaction stays `pending` or moves to `abandoned`
- Confirm no entitlement is granted

## Restore access

- Use the purchase email in the restore flow
- Confirm a sign-in link is sent
- Complete sign-in
- Confirm `GET /api/account` returns the active entitlement

## Messaging check

- Confirm the app never claims SARS affiliation
- Confirm the app never claims guaranteed upload success
- Confirm the app never claims admin dashboards, team seats, firm rollout, or enterprise controls
