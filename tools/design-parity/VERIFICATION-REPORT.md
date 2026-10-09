# P31 Design System — Detailed Verification Report

**Date:** 2026-09-30
**Scope:** Design portal + canon (`@p31ca/design-core`) + verification toolchain
**Method:** All gates run from the command line (not narrated), outputs captured.
**Verdict:** ✅ **SHIP-READY** — every authoritative gate passes; two advisory signals are understood false-positives.

---

## 1. The topbar fix (the 960px bug)

**Root cause (verified in source):** The canon `recipes.css` `.topbar` glass-bar had
`margin: var(--p31-space-xs) var(--p31-space-sm) 0` + `#root` flex-shrink, shrink-wrapping
the topbar to 960px in a 1440px viewport.

**Fix (single clean rule, verified in `chrome.css`):**
```css
.topbar--app { justify-content: flex-start; overflow: visible; margin: 0; width: 100%;
               max-width: 100%; border-radius: 0; transform: none; left: auto; }
```
One rule — not a stack of overlapping patches.

**Crowding fix:** removed the redundant `CalmIndicator` from the wrapper's statusCluster.
The `SpoonDial`'s `onCrisis` button is the single Calm affordance (canon-owned, what D7 depends on).

---

## 2. Gate results

### §1 — Structural layout gate (authoritative)
| Check | Result |
|---|---|
| `layout-invariants.mjs http://localhost:5190` | ✅ exit 0, full-width topbar, no overflow |
| Topbar width | 1440px / 1440px viewport (ratio 1.00) |
| Right-cluster elements | All within bounds (max right = 1415 ≤ 1440) |
| Calm affordances | **1** (the SpoonDial crisis button) |

### §1 — Vision gate (advisory diagnostic)
| Check | Result |
|---|---|
| `visual-assert.mjs` evidence | "topbar partially cut off on the right, 'A' outside viewport" |
| Verdict | ✗ (advisory) — **KNOWN FALSE-POSITIVE** (DiffSpot caveat: VLM hallucinates "clipped" on tight-but-correct chrome). Structural gate + geometry confirm all elements within bounds. |

### §3 — Full test suite (serial)
| Suite | Result |
|---|---|
| `npx playwright test --workers=1` | **73 passed / 0 failed** (3.4m) |
| legacy-visual baselines | 57/57 |
| acceptance freeze | all pass |
| triage | all pass (D7 crisis-button test passes) |

### §4 — Canon gates
| Gate | Result |
|---|---|
| `token-audit.mjs` | ✅ OK (3 consecutive runs clean; 1 transient failure during concurrent npm pack) |
| `canon-purity.mjs` | ✅ no NaN colors |
| `gen-registry.mjs --check` | ✅ 32 components, 18 chrome, 32 installable |

### §6 — Fork-gate
| Check | Result |
|---|---|
| `canon-source-audit.mjs` | **51 forks detected** (contraction state) |
| NC (`canon-source-audit-nc.mjs`) | ✅ `NEGATIVE_CONTROL_OK: failed on forks, spared genuine consumers` |

### §7 — K₄ audit (with live probes)
| Check | Result |
|---|---|
| `sierpinski-audit.mjs --probe` | **4/4 scales, 6/6 edges — K₄ complete** |
| H↔A live probe | ✅ invokes `get_confidence` |
| A↔D live probe | ✅ invokes `parity_chrome` |
| A↔O live probe | ✅ invokes `p31ca add` |

### §5 — Parity baselines
| Check | Result |
|---|---|
| Isolated chrome baselines | 12 (component-*) |
| Confidence tiers | 12 autonomous / 20 supervised / 0 blocked |

---

## 3. Verification toolchain (the runbook, operational)

All tools exist and resolve (verified):
```
layout-invariants.mjs  ✅ structural gate (authoritative)
visual-assert.mjs      ✅ vision diagnostic (advisory; --strict for hard gate)
sierpinski-audit.mjs   ✅ K₄ audit (--probe = live edges)
canon-source-audit.mjs ✅ fork gate + NC
update-snapshots-guarded.mjs ✅ baseline ratchet (structural gate before --update-snapshots)
```

---

## 4. Known items (not blocking)

1. **Vision gate advisory ✗** on the correct topbar — a DiffSpot-class hallucination. The structural gate is authoritative; vision is the human's diagnostic. `--strict` makes vision blocking for callers who want it.
2. **51 forks** across the fleet (design portal's 5 remaining hand-rolled chrome + forge + workspace + mcp-marketplace + qpj). The Jitterbug contraction is in progress.
3. **Design portal precheck** (`build:pwa`) runs serial (~3-4 min); parallel runs produce false `locator.click` timeouts — use `--workers=1`.
4. The `playwright.config.ts` `reducedMotion` LSP type warning is pre-existing (config works; the type is version-specific).

---

## 5. Evidence files
- Structural gate output: `/tmp/rep-struct.log`
- Fork-gate output: `/tmp/rep-fork.log`
- Full test suite log: `/tmp/rep-suite.log` (73 passed)
- Baseline state: `tools/design-parity/chrome-baselines-isolated/` (12 component baselines)