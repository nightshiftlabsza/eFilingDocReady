# Paystack Setup

## Required keys

- `PAYSTACK_SECRET_KEY`
- `VITE_PAYSTACK_PUBLIC_KEY`

## Webhook URL

Point Paystack webhooks to:

- `https://your-railway-domain/api/webhooks/paystack`

In production with Cloudflare in front:
- `https://api.docready.co.za/api/webhooks/paystack`

## Notes

- The frontend does not grant premium access from the Paystack client callback alone.
- Premium access is granted only after the Railway webhook updates Postgres entitlement state.
- Webhook events are stored in `webhook_events` for dedupe and replay protection.
- Pending payments are created first in `transactions`.

## Product mapping

The backend maps Paystack payments to these internal product codes:
- `taxpayer_pass_onceoff`
- `practitioner_pass_onceoff`

## Security

- Verify `x-paystack-signature`
- Reject malformed payloads
- Ignore duplicate webhook deliveries
- Never trust the browser callback as the billing source of truth
