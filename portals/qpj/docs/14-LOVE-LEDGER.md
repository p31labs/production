# 14 — Love ledger: the dual currency

Status: shipped (Commit 6)

QPJ runs on **two currencies**. Spoons are the day's energy — session-scoped,
spendable, resettable. LOVE is the family's trust — a durable, soulbound,
non-transferable ledger that outlives sessions. LOVE is the qpj micro of
**Paper XI, the L.O.V.E. Protocol** (see `P31-local-workspace/docs/LOVE_LITEPAPER.md`).

## Protocol mapping (Paper XI → qpj micro)

| Paper XI | This build |
|---|---|
| Care acts earn LOVE | `earnLove(source, by)` wired to talk messages, milestone SBTs, artifact launches, identity claims, mesh joins |
| Two-pool model, 50/50 split | `splitEarn` → **Sovereignty** (vested, never spent in-app) + **Performance** (spendable) |
| Care score gates earnings | `careGatedAmount(weight, careScore)` — a cold jar earns less |
| Scores decay, not hoard | `decayedCareScore` after 7 idle days (0.05/day → floor 0.1) |
| Spent exclusively on care | `spendLove(amount, to)` spends **only** the performance pool |
| Per-DID hash chain (off-chain) | Local `log` of bounded entries (40) recording who, what, when |

The off-chain Cloudflare ledger, ERC-5192 badges, and MCP server from Paper XI
are the *backend destiny*; this micro keeps the family experience local-first.

## Pure core — `src/lib/love.ts`

Deterministic, unit-tested helpers: `LOVE_WEIGHTS` per source,
`splitEarn`, `careGatedAmount`, `warmedCareScore` (cap 1.0), `decayedCareScore`
(grace 7 days), `pruneLoveLog`, `roundTrunc`. Care-score range is `0.1 → 1.0`.

## Store — `earnLove` / `spendLove`

- `earnLove(source, by)`: decay-check the score, gate the weight, split 50/50,
  bump the score, append a ledger entry. **Persisted** via `partialize` (the
  family ledger survives reloads).
- `spendLove(amount, to)`: draws from performance only; overspend clamps; a
  spend records a negative entry through the current passport.
- `setPassport` intentionally does **not** touch `love` — LOVE is family
  property; spoons/talk are the session that resets.

## Earnings wiring

| Care act | Source | Weight |
|---|---|---|
| Send a talk message | `talk` | 1 |
| Mint an SBT milestone | `milestone` | 2 |
| Launch a craft artifact | `artifact` | 2 |
| Claim an identity | `identity` | 3 |
| Join the street mesh | `mesh` | 0.5 |

## Surfaces

- **Topbar chip** — `MetricBadge` (design-core) showing the performance pool,
  `--p31-lantern` gold, label hidden on narrow screens.
- **`LOVELedgerCard`** — on the Street page: both pools, a care-score meter,
  a **Gift a care note** action (spends 1 from performance, `data-love-ledger`
  audit hook), and the recent ledger log.

Zero hardcoded colors. "Spoons run the day; LOVE keeps the family."

## Tests

`src/__tests__/love-ledger.test.tsx` — split/decay/gating/prune math,
earn-and-log, spend-only-performance, overspend clamp, passport-switch
survival, card render + disabled/active care-note.