# Runbook: RLDF Training Data Export

## 1. Overview
- **Alert name:** `rldf-training-data-low`
- **Severity:** P3
- **Related services:** canon (Loom), chat portal (loomEmit), ui-forge
  (rldf-train)
- **Owner:** @phos-ai-proxy
- **Last written:** 2026-10-02
- **Last verified:** 2026-10-02 (content verified against live probes; not yet drilled)
- **Drill cadence:** Quarterly (P3)
- **Drill status:** NOT YET DRILLED
- **Drill record:**
  - Date: (pending)
  - Participants: (pending)
  - Result: (pending — pass / partial / fail)
  - Issues found: (pending)
  - Estimated vs actual repair time: (pending)

## 2. Symptoms
- `rldf-train.mjs` reports `image pairs: 0`.
- No `chat.artifact.generated` events accumulate in the Loom log.
- The reward model has nothing to train on (STATUS.md known gap).

## 3. Impact Assessment
- **Affected users:** the training loop; fidelity signal stays heuristic.
- **Business impact:** the Governor's fidelity score remains the anti-slop
  rubric; the "trainable" promise is unfulfilled until pairs exist.
- **Upstream/downstream:** DPO/KTO text policy also stalls without events.

## 4. Diagnostic Steps

1. Check whether the Loom log has events. In the chat portal, open the
   IndexedDB `p31-sandbox` → `settings` → key `loom-events`:
   - Empty or missing → the loomEmit wiring is not firing.
2. Confirm the wiring is live:
   - `sandboxStore.addArtifact` calls `emitGenerated(art)`.
   - `sandboxStore.updateArtifactCode` calls `emitRevised({ id, code })`.
3. Confirm the store exists (the P3 dependency):
   - `artifactPersistence.ts` `openDB()` creates a `settings` store with
     `keyPath: 'key'`; `loadSetting`/`saveSetting` are exported.
4. Export with consent:
   ```bash
   cd packages/ui-forge
   node scripts/rldf-train.mjs --log <transcript.jsonl> --consent --out ./rldf-out
   ```
   Expected: `image pairs: N  (paired: M, single-shot: K)`, `pref pairs: P`.

## 5. Fix Steps

### Scenario A — no events in the log
1. Open the chat portal, create an artifact, then edit it. Each should append
   a `chat.artifact.generated` event (the second carries `screenshotRef2`).
2. If events still do not appear, check the browser console for a
   `[loomEmit]` failure (IndexedDB quota or missing store). Fix the store
   creation or the capture call.
3. Re-run the export.

### Scenario B — pairs exist but `paired` is 0
1. A "paired" pair needs both `screenshotRef` (create) and `screenshotRef2`
   (edit). Edit each artifact to form the (original, improved) pair.
2. Re-run the export. Expected `paired` > 0.

### Scenario C — export fails on consent
- `--consent` is a hard gate (COPPA/People-First). Re-run with `--consent`.
- Confirm only `shared`-scope events are eligible; `personal` events are never
  exported.

### Scenario D — want the full fine-tune
1. Follow `packages/canon/docs/LUMI-TRAINING.md`: QLoRA on a 360M–3B base,
   SFT on `lumi.sft.jsonl`, DPO on `lumi.pref.jsonl`.
2. Export GGUF → serve via llama.cpp on-device.
3. Wire the reward model as the Governor's fidelity score.

## 6. Escalation
- If captures silently stop for > 1 week: contact @phos-ai-proxy.
- Escalation: @canon-owner (Loom event-kind questions).
- Note: PNG capture (html-to-image / in-iframe canvas) is a documented gap —
  today's capture is the serialized HTML fragment (feeds the text-policy
  layer). See STATUS.md.

## 7. Post-Actions
- Track `image pairs` and `paired` counts per export; add to monitoring if the
  loop is production.
- When PNG capture lands, re-document the reward-model path in
  `architecture/02-training-loop.md`.
- **Drill:** first drill before relying on this runbook. Fill the `Drill
  record` in §1 (date, participants, result, issues, estimated vs actual
  repair time). P3 → drill quarterly thereafter.