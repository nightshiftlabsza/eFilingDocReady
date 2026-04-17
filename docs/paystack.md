# Paystack Setup

DocReady must launch safely inside the shared Nightshift Labs ZA Paystack account without breaking LekkerLedger.

## Required keys

- `PAYSTACK_SECRET_KEY`
- `VITE_PAYSTACK_PUBLIC_KEY`

## Shared-account rules

- Every DocReady payment reference must start with `DR_`
- DocReady must never process `LL_` references
- DocReady metadata must always include:
  - `product_slug=docready`
  - `plan_code`
  - `internal_tx_id`
  - `customer_email`
  - `environment`
- The browser callback must never unlock premium access by itself
- Backend verification by reference is the primary launch unlock path

## Reference format

Use this exact format:

`DR_<environment>_<timestamp_ms>_<random16hex>`

Example:

`DR_production_1776412800000_a1b2c3d4e5f60718`

## Metadata format

Send this exact metadata object on Paystack initialize:

```json
{
  "product_slug": "docready",
  "plan_code": "taxpayer_pass_onceoff",
  "internal_tx_id": "<transactions.id uuid>",
  "customer_email": "<normalized lowercase email>",
  "environment": "production"
}
```

Allowed `plan_code` values:

- `taxpayer_pass_onceoff`
- `practitioner_pass_onceoff`

## Launch-safe payment flow

1. `POST /api/payments/initiate` creates the pending transaction and the `DR_` reference.
2. The backend sends the exact DocReady metadata to Paystack.
3. Paystack returns the customer to `https://docready.co.za/payment/callback?reference=<DR_...>`.
4. The frontend immediately calls `POST /api/payments/verify`.
5. The backend verifies the payment by reference and grants the entitlement only when all checks pass.
6. `POST /api/webhooks/paystack` remains idempotent and available, but launch does not depend on taking over the current shared account-level webhook this week.

## Verification checks

Before granting access, the backend must confirm:

- Paystack status is `success`
- reference prefix is `DR_`
- amount matches the expected DocReady plan amount
- currency matches the expected DocReady currency
- `product_slug=docready`
- `plan_code` is one of the allowed DocReady launch plans
- `internal_tx_id` matches the pending DocReady transaction
- `customer_email` matches the pending DocReady transaction email

## Webhook handling

- Verify `x-paystack-signature`
- Reject malformed payloads
- Ignore duplicate webhook deliveries
- Hard-ignore any non-DocReady reference such as `LL_...`
- Do not replace the shared Paystack webhook unless it is clearly safe for LekkerLedger

## Customer-facing checkout copy

Show this message in checkout/support copy:

`Secure checkout by Paystack. Payments may appear under Nightshift Labs ZA.`
