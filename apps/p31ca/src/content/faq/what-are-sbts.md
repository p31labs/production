---
q: What are SBTs?
a: Soulbound tokens — hash-chained, non-transferable records of a family member's achievements and milestones. Each one links to the next in a tamper-evident chain; a tampered title breaks verification.
category: family
---

The SBT chain is real: `verifySbtChain` recomputes every link, and the test suite covers genesis, linking, verification, tamper-detection, idempotency, and hash determinism. Milestones mint and anchor best-effort, so a child's progress is recorded without a central ledger.