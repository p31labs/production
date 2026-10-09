# P31 Community Governance Framework

The P31 Capital Machine is community-funded and community-owned. This document is
the operating agreement for how the community makes decisions, recognizes
contributions, and allocates resources. It is intentionally short and legible;
it can only be changed by the constitutional process defined in section 3.

## 1. The model: SBT-weighted merit voting

Voting weight is derived from **verified contribution diversity**, not capital
alone. The model follows the **Karn Protocol**: merit outweighs capital, and
linear time-decay prevents dynasties.

- **Four contribution tracks.** Weight is earned across capital, code, advocacy,
  and expertise. No single track — and no single capital contribution — can
  dominate, because each track is capped relative to total weight.
- **Anchored in soulbound tokens.** Weight is tied to SBTs held by a
  contributor's sovereign DID in the p31-sbt registry. Tokens are
  non-transferable and hash-anchored, so weight cannot be bought, rented, or
  gifted.
- **Linear decay.** A contributor's weight decays linearly over 180 days of
  inactivity, down to a floor. A verified contribution re-engages the account
  and restores full weight.
- **Self-renewing by construction.** Decay is what keeps the system honest:
  no one holds permanent influence through past contributions alone. The people
  actively making the machine better today are the people steering it tomorrow.

### How weight is computed

Weight is a function of the contributor's SBT set, not a wallet balance:

1. Each SBT contributes to one of the four tracks (capital, code, advocacy,
   expertise) with a per-tier coefficient. The `founding-contributor` SBT also
   spans capital and expertise, rewarding early, ongoing commitment without
   letting it dominate.
2. Track weights are summed, then each track is capped at a fixed share of the
   total so a single track — or a single large capital contribution — cannot
   capture the vote.
3. The resulting weight is multiplied by an activity multiplier that decays
   linearly from 1.0 to the floor over 180 days without a verified
   contribution, and snaps back to 1.0 on the next one.

The exact coefficients live in the p31-sbt registry and are reviewable on
`#/community`. Changing them is a significant decision; changing the decay
window or the floor is constitutional.

## 2. Contributor tiers

Tiers are recognized by SBTs from the p31-sbt registry and signal both the
contribution type and the weight track it feeds.

| Tier | SBT type | Track |
|---|---|---|
| Founding Contributor | `founding-contributor` | capital + expertise |
| Community Builder | `community-builder` | advocacy |
| Code Contributor | `code-contributor` | code |
| Impact Amplifier | `impact-amplifier` | advocacy |
| Care Keeper | `care-keeper` | expertise |

The base recognition SBT `proof-of-contribution` is issued for any verified
contribution — a donation, a review, documentation, a bug report. Tiers are
non-transferable, non-fungible, and verifiable per DID.

## 3. Decision types

| Type | Decided by | Window | Threshold |
|---|---|---|---|
| Routine | operator | immediate | n/a — daily operations |
| Significant | community vote | 7 days | majority of votes cast |
| Constitutional | community vote | 7 days | supermajority (two-thirds) + quorum |

- **Routine** decisions are operational: spending below a threshold,
  configuration changes, and day-to-day routing. The operator acts and reports
  publicly; the report is the accountability mechanism.
- **Significant** decisions change how the machine works: new fee structures,
  new integrations, funding allocations above the routine floor, and
  contributor-tier policy.
- **Constitutional** decisions amend this framework, change voting rules, or
  touch the treasury itself. They require a supermajority and a quorum floor so
  that a small active minority cannot rewrite the agreement.

## 4. Funding allocation

- **Transparent and hash-chained.** Every allocation is written to the same
  append-only hash-chained ledger used for settlements, so each disbursement
  can be independently verified against the chain.
- **Treasury withdrawals require governance approval.** Routine withdrawals are
  authorized by the operator and posted publicly with a hash link. Significant
  and constitutional withdrawals require a community vote per section 3.
- **No secret allocation.** The ledger is append-only and each entry carries a
  `prev_hash` link. Tampering is detectable, and verification is a public
  endpoint.
- **Routine floor is published.** The threshold that separates routine from
  significant withdrawals is fixed in the ledger and revisited no less often
  than annually as a significant decision.

## 5. Conflict resolution and escalation

1. **Discuss openly.** First step is the public channel for the affected
   surface. Assume good faith; state the evidence.
2. **Escalate to a vote.** If a matter is unresolved after 7 days, escalate it
   as a significant proposal under section 3.
3. **Escalate to the framework.** Constitutional matters go to the full
   process: supermajority plus quorum.
4. **Facts are settled by evidence, not votes.** Disputes about what happened
   are resolved against the hash-chained records, which are ground truth.
5. **Third-party arbitration.** Anyone may engage a third-party arbiter at
   their own cost. The outcome binds only the parties who consent.

## 6. Why merit, not capital

Capital alone concentrates control and rewards the earliest checks at the
expense of ongoing contribution. The Karn Protocol framing is deliberate:

- **Merit over capital.** A community that funds and builds the machine should
  steer it, in proportion to what they continue to do, not what they once paid.
- **Decay prevents dynasties.** No one holds inherited influence; weight must be
  re-earned through verified activity within a 180-day window.

The result is a governance surface that is community-owned, evidence-backed,
and structurally incapable of capture by a single large check.

## 7. Status and amendment

This is the initial framework, published with the community surface
(`#/community`). The surface renders these rules live — active proposals,
proposal types, contribution recognition, and fund transparency — and links the
p31-sbt registry. Amendments require the constitutional process in section 3.