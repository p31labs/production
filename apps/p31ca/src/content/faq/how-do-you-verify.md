---
q: How do you prove the audit chain is real?
a: Run three commands from the enterprise package — the verify endpoint recomputes the chain from genesis and returns the current head. It is a live request against a deployed endpoint, not a screenshot. Anyone can run it. No account needed.
category: stack
---

The verification protocol is public: `curl https://loom-verify.pages.dev/api/loom/verify`. The chain also supports Merkle batch anchoring (O(log n) inclusion proofs) and optional ML-DSA-65 signatures at NIST Level 3.