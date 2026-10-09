---
q: What is the Loom?
a: A hash-chained audit log for agent actions. Every event is appended with a SHA-256 chain under RFC 8785 canonicalization, and the public verify endpoint recomputes the whole chain from genesis. If a block is tampered with, verification fails.
category: stack
---

The Loom is the single primitive applied across every surface where an agent touches a family's data. The public endpoint — `GET /api/loom-public/verify` — returns `{ valid, checked, head }` and is the fastest way to prove the chain is real. See the <a href="/apps/loom">Loom demo</a>.