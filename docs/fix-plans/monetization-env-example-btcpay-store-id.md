<!-- P31-HEADER
id: p31_fix_plan_monetization_env_example_btcpay_store_id_20261014_v1.0
type: fix-plan
component: monetization
status: resolved
retention: archive-90d
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: .env.example ships a real-looking BTCPay store id

## Symptom

`monetization/.env.example` sets
`VITE_BTCPAY_STORE_ID=5nPURCXnK5UMYQF2K9LYSo52nzSEYfJXm8tncnQbKLF9`. The
example file is tracked and public; if this is (or was) a production BTCPay
store id, it leaks store identity to anyone with repo access. Store ids alone
are not a payment credential, but paired with the BTCPay API key they are, and
the pattern teaches contributors to commit real values into `.env.example`.

## Evidence

- `monetization/.env.example` line with `VITE_BTCPAY_STORE_ID=5nPURCX…` (tracked).
- `git ls-files monetization/.env.example` → tracked (parent `.gitignore`
  exempts `!.env.example`).

## Root cause

A real value was copied into the example as a "default" while wiring the BTCPay
surface.

## Fix

1. Replace the value with a placeholder (`VITE_BTCPAY_STORE_ID=` or
   `your-btcpay-store-id`).
2. Verify against the BTCPay server (`127.0.0.1:8082`) which store id is live
   and rotate the store's API key if the leaked value is real.

## Verification

- `.env.example` contains no 44-char base64 value resembling a live store id.
- `git grep BTCPAY_STORE_ID` shows only the placeholder in examples.

## Impact

Low (store id is not alone sufficient to move funds), but avoidable identity
leakage with an easy fix.

## Resolution (2026-10-14)

- `VITE_BTCPAY_STORE_ID` in `monetization/.env.example` replaced with an empty
  placeholder; the live value must be supplied via the local `.env`.

## Remaining (owner)

If the leaked store id was ever live in production, rotate the BTCPay store's
API key on `127.0.0.1:8082`.