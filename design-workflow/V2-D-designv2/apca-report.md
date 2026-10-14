<!-- P31-HEADER
id: p31_v2d_apca_report_20261011_v1.0
type: lane-deliverable
component: design-workflow
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-d-designv2
-->

# D-3 · APCA Sanity Layer

**Lane:** D v2.0 · **Module:** `apca.mjs` (zero dependencies, Node 24 ESM)
**Scored theme:** `themes.cipher` — the live theme (runbook-verified default).

> **MANDATORY DISCLAIMER:** APCA is the candidate contrast method for WCAG 3, currently in public beta. WCAG 2.2 AA remains the legal floor.

This pass runs **alongside** the portal's WCAG 2.2 `contrast-audit.mjs`
(`portals/design/scripts/contrast-audit.mjs`) — it does not replace it, and it
makes no WCAG 3 conformance claims of any kind. It is a perceptual sanity
check with reference floors (Lc 60 body / Lc 45 large), exactly per runbook
§2.9/§7 D-3.

---

## 1. What was ported (and from where)

Zero-dep port of the **APCA 0.0.98G-4g** base algorithm — the W3-licensed
`apca-w3` code (library 0.1.9; constants unchanged since 0.1.0, last changed
2021-02-15). Port source of truth:

- `https://github.com/Myndex/apca-w3` — `src/apca-w3.js` (`APCAcontrast`, `sRGBtoY`)
- Constants: README "Current APCA Constants" block (exponents, coefficients, clamps, scalers)

Ported faithfully, documented in `apca.mjs` comments:

1. **sRGB → Y** (APCA's own Y, simple 2.4 monitor exponent — *not* the IEC piecewise):
   `Y = 0.2126729·(R/255)^2.4 + 0.7151522·(G/255)^2.4 + 0.0721750·(B/255)^2.4`
2. **Soft black clamp** (flare compensation), both colors:
   `Y ≤ 0.022 → Y' = Y + (0.022 − Y)^1.414`
3. **Early return:** `|bgY − txtY| < 0.0005 → Lc = 0`
4. **Polarity branches** (two different exponent sets — by design):
   - normal (dark on light): `SAPC = (bgY^0.56 − txtY^0.57) × 1.14`; `Lc = SAPC < 0.1 ? 0 : (SAPC − 0.027) × 100`
   - reverse (light on dark, signed negative): `SAPC = (bgY^0.65 − txtY^0.62) × 1.14`; `Lc = SAPC > −0.1 ? 0 : (SAPC + 0.027) × 100`
5. **Official output range:** −108.0 … +106.0 (apca-w3 README).

Canon tokens are OKLCH; the pipeline is OKLCH → sRGB8 (`../D-embedded/oklch-to-srgb.mjs`,
imported READ-ONLY — v1.0 math) → the port. Glass tokens are composited over
their backdrop in sRGB8 space (documented approximation; the official
`alphaBlend` is gamma-space — difference < 1 LSB on near-neutral glass).

## 2. Self-checks (`node apca.mjs --selfcheck`) — ALL PASS

**(a) Cross-check vs official apca-w3 test suite** — the ava suite shipped in
`github.com/Myndex/apca-w3` `test/index.js` (same G-4g constants), asserted
exact to 1e-6:

```
  PASS  Lc(#888 on #FFF) = 63.056470  ref 63.056469930209424
  PASS  Lc(#FFF on #888) = -68.541464  ref -68.54146436644962
  PASS  Lc(#000 on #aaa) = 58.146263  ref 58.146262578561334
  PASS  Lc(#aaa on #000) = -56.241133  ref -56.24113336839742
  PASS  Lc(#123 on #def) = 91.668308  ref 91.66830811481631
  PASS  Lc(#def on #123) = -93.067700  ref -93.06770049484275
  PASS  Lc(#123 on #444) = 8.323261   ref 8.32326136957393
  PASS  Lc(#444 on #123) = -7.526878  ref -7.526878460278154
```

Plus the alpha pair from the same suite: `Lc(#0006 on #FFF) = 54.621840674414`
vs official `54.62184067441377` (Δ 6e-13). The README's `fontLookupAPCA(-68.541)`
example corresponds to our `#FFF on #888` = −68.541 — third published match.

**(b) Black/white extremes** (official range −108.0 … 106.0):

```
  PASS  Lc(#000 on #FFF) = 106.04   (≈ +106)
  PASS  Lc(#FFF on #000) = -107.88  (official range bound)
```

**(c) Polarity** — sign flip is guaranteed for every pair. Note for the record:
`Lc(fg,bg) == −Lc(bg,fg)` is **not** an exact APCA property: the normal and
reverse branches use different exponent sets (0.56/0.57 vs 0.65/0.62) tuned per
polarity, and the official reference values themselves show it —
`Lc(#888,#FFF) = +63.056` vs `Lc(#FFF,#888) = −68.541` (spread 5.485). The port
reproduces the official asymmetric values **exactly**; no symmetry is claimed
(the apca-w3 source explicitly warns "APCA is polarity sensitive! Do not mix
up text and background inputs").

**(d) Monotonicity** — darker text on the same background → larger |Lc|:

```
  PASS  gray #EE→#00 on #FFF: |Lc| = 7.6, 27.3, 45.8, 63.1, 78.8, 92.6, 102.9, 106.0
  PASS  gray #11→#FF on #111: |Lc| = 0.0, 0.0, 15.6, 30.1, 46.7, 65.2, 85.5, 107.4
```

## 3. Canon score — themes.cipher (live theme), floors body ≥ 60 · large/UI ≥ 45 · non-text ≥ 30

```
pair                       Lc         floor  result
----------------------------------------------------------
text-primary on bg           -99.1      60  pass
text-secondary on bg         -58.4      60  FLAG
text-tertiary on bg          -28.0      45  FLAG
text-primary on surface      -98.9      60  pass
text-secondary on surface    -58.2      60  FLAG
text-tertiary on surface     -27.8      45  FLAG
text-primary on surface2     -97.6      60  pass
text-secondary on surface2   -56.9      60  FLAG
text-tertiary on surface2    -26.5      45  FLAG
accent on bg                 -49.7      45  pass
accent-cyan on bg            -49.7      45  pass
accent-gold on bg            -39.6      45  FLAG
accent-green on bg           -43.1      45  FLAG
accent-red on bg             -39.9      45  FLAG
accent-iris on bg            -42.3      45  FLAG
accent-violet on bg          -40.3      45  FLAG
text-primary on accent       -48.6      45  pass
glass-border on bg             0.0      30  FLAG
```

### Reading (sanity layer, not a conformance verdict)

- **text-primary**: ~Lc −99 on all three surfaces — strong pass.
- **text-secondary**: −58.4/−58.2/−56.9 — **borderline FLAG** vs the Lc 60
  body floor (APCA docs: content that is not body text may use Lc 60−15 = 45;
  secondary text therefore clears the sub-fluent floor but not body). Filed as
  observation O1, not a claim.
- **text-tertiary**: ~−28/−27 — below even the Lc 30 spot-text absolute
  minimum from the APCA docs. Observation O2: tertiary/muted text on the live
  theme is below every reference floor and warrants a token-level review.
- **accent variants**: only `accent`/`accent-cyan` clear Lc 45 as text on `bg`;
  gold/green/red/iris/violet sit at |Lc| 39.6–43.1 — they clear the Lc 30
  non-text minimum (icons, large solid elements) but not the large-text floor.
  Observation O3.
- **glass-border on bg**: Lc 0.0 — the 10%-alpha near-white border over the
  dark `bg` is below the Lc 15 discernibility minimum (decorative separator;
  it carries no content). Observation O4.

## 4. Inline comment emission (`/* Lc XX.X on --bg */`)

```
  /* Lc 99.1 on --bg */  /* text-primary on bg, floor 60: pass */
  /* Lc 58.4 on --bg */  /* text-secondary on bg, floor 60: FLAG */
  /* Lc 28.0 on --bg */  /* text-tertiary on bg, floor 45: FLAG */
  /* Lc 98.9 on --surface */  /* text-primary on surface, floor 60: pass */
  … (full 18-pair set in apca.mjs output)
```

## 5. Negative control (a gate that cannot fail is furniture)

```bash
node apca.mjs --negative
```

```
=== APCA negative control (deliberately low-contrast fixture) ===
pair: #767676 (text) on #7A7A7A (bg)  — mid-gray on mid-gray
Lc = 0.00
floor check vs large-text floor 45: FLAG (below floor)
RESULT: FLAGGED (gate can fail)
```

## 6. Coexistence contract

| Layer | What it is | Status |
|---|---|---|
| `portals/design/scripts/contrast-audit.mjs` | WCAG 2.2 AA ratio gate (4.5:1 / 3:1) | **legal floor — unchanged** |
| `apca.mjs` (this lane) | APCA 0.0.98G-4g perceptual sanity pass, flags below Lc 60/45 | candidate method, public beta |

The two are run side by side; neither is a substitute for the other. No output
of this lane may be cited as WCAG 3 conformance. **APCA is the candidate contrast method for WCAG 3, currently in public beta. WCAG 2.2 AA remains the legal floor.**

## 7. Files in this lane

- `apca.mjs` — the port + self-checks + canon scoring + negative control

**No canon file was modified. No package was vendored. No npm installs.**