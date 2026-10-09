---
description: Respond to a workspace incident (S1-S4)
agent: Workspace Architect
subtask: false
---

# /incident — P31 Quantum Material Workspace

1. Classify: `curl -I https://workspace.p31ca.org` → S1 (non-200) / S2 (single surface) / S3 (cosmetic) / S4 (docs).
2. S1: run the green chain (`pnpm typecheck && pnpm lint && pnpm test && pnpm build && node scripts/token-audit.mjs`) then `pnpm deploy`; on failure redeploy last known-good `dist/` (`git log --oneline dist/`).
3. S2: check `src/features/<surface>/` recent commits; `pnpm test -- src/features/<surface>/`.
4. S3: `node scripts/token-audit.mjs`; diff `src/tokens.css` + `src/workspace.css`.
5. S4: diff docs vs source; Scribe updates.
6. Every S1/S2: append a blameless entry to `docs/INCIDENT_LOG.md` (template at the bottom).
7. Gate every change per `docs/AGENT_RUNBOOK.md` §4.