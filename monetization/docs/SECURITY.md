# P31 Capital Machine — Security Runbook

> Security and safety always in front. This is the rotation + least-privilege
> reference for the capital machine. Per operator policy, **all credentials
> shared in any agent session are considered compromised and MUST be rotated
> once the session's changes are confirmed working.**

## 1. Credentials exposed in the 2026-09-25 session (rotate these)

| Credential | Where it was used | Rotation action |
|---|---|---|
| CDP API Key ID `73250c97-c9f6-476f-875f-35980a9216be` | `wrangler secret put FACILITATOR_KEY_ID` (p31-capital-machine-mcp) | Generate a **new secret API key** at portal.cdp.coinbase.com, ideally **without Trade/wallet permissions** (seller-only needs read/transfer). Re-set the secret. |
| CDP client API key (facilitator secret) | `wrangler secret put FACILITATOR_SECRET_KEY` | New key secret; re-set. |
| MetaMask private key → wallet `0xF68f0a09b4cbC2D012B6BA01C787d3FFE4C47058` | `wrangler secret put PRIVATE_KEY_ETH` (mev-arbitrage); `PAY_TO` in wrangler.toml | **Most critical.** Move any funds to a fresh wallet, generate a new key, re-set `PRIVATE_KEY_ETH`; update `PAY_TO` in `p31-capital-machine-mcp/wrangler.toml`. |
| Sentry full-access org token | API calls only (never stored) | Rotate at sentry.io → Settings → Auth Tokens. |
| Sentry DSN (public) | `VITE_SENTRY_DSN` in `production/monetization/.env` (gitignored) | DSN is public; rotate the client key if the project is re-created. |
| BTCPay API key + webhook secret | `wrangler secret put BTCPAY_API_KEY` / `BTCPAY_WEBHOOK_SECRET` (btcpay-gateway) | Rotate in BTCPay → Account → API Keys and webhook settings. |

Re-wiring commands (run from each worker dir after rotation):

```bash
# p31-capital-machine-mcp
wrangler secret put FACILITATOR_KEY_ID
wrangler secret put FACILITATOR_SECRET_KEY

# mev-arbitrage (p31-capital-machine/workers/mev-arbitrage)
wrangler secret put PRIVATE_KEY_ETH

# btcpay-gateway
wrangler secret put BTCPAY_API_KEY
wrangler secret put BTCPAY_WEBHOOK_SECRET
```

## 2. Least-privilege model

**CDP key**: seller/facilitator only — no Trade, no wallet export. If the key
has those permissions, scope it down at rotation.

**BTCPay API key** — grant ONLY:
- `btcpay.store.canviewinvoices` — live invoice readouts
- `btcpay.store.cancreateinvoice` — donation / subscription flow
- `btcpay.store.webhooks.canmodifywebhooks` — webhook management
- `btcpay.store.canviewstoresettings` — store health

Do **NOT** grant: `canmanagewallets`, `cancreatetransactions`,
`cansigntransactions`, or unrestricted.

## 3. Webhook verification requirements (btcpay-gateway `/webhook`)

- Read the **raw request body** before any parsing; compute
  `sha256=HMAC_SHA256(webhook_secret, rawBody)`.
- Reject (401) any request without a valid `Btcpay-Sig` header.
- Compare with `crypto.subtle` in constant time.
- Idempotency: `uq_btcpay_invoice` UNIQUE index on `btcpay_donations(invoice_id)`
  + `INSERT OR IGNORE` — BTCPay retries cannot double-record.
- Handle `InvoiceSettled`/`InvoicePaid` → record donation + revenue ledger;
  `InvoiceExpired` → mark expired.

## 4. BTCPay 2.4.2 incident — lesson

The August 2026 LND vulnerability let unauthenticated attackers obtain `.macaroon`
files and drain Lightning wallets. **Patching without rotating credentials is
incomplete remediation.** Any LND exposed outside BTCPay must rotate its
macaroons separately. This is why every credential in this runbook gets rotated
after each session, and why the BTCPay API key is scoped read/create only.

## 5. Rotation cadence

- After every agent session that touches secrets: full rotation (Section 1).
- BTCPay webhook secret: rotate with the store's webhook settings.
- Never commit secrets; `.env`, `.admin_token`, and `*.token` are gitignored.