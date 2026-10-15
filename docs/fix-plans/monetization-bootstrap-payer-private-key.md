<!-- P31-HEADER
id: p31_fix_plan_monetization_bootstrap_payer_private_key_20261014_v1.0
type: fix-plan
component: monetization
status: resolved
retention: archive-90d
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: bootstrap-payer.json holds an EVM private key on disk

## Symptom

`monetization/.bootstrap-payer.json` contains an EVM address and its
`privateKey` (0x75349c…) for a "500 credits (~$2.50)" test grant. The file is
gitignored (`.gitignore` lists `.bootstrap-payer.json`), so it is not in the
repo — but it sits in the working tree, readable by any local process or
backup, and would be committed by any future `.gitignore` edit or accidental
`git add -f`.

## Evidence

- `monetization/.bootstrap-payer.json` (present, gitignored) contains
  `"privateKey": "0x75349c66211550880233374091e47e580de88ccc01d07627afdf9d3c885e801d"`.
- `git ls-files monetization/.bootstrap-payer.json` → empty (not committed).

## Root cause

The bootstrap orchestrator persisted the payer wallet it generated into the
project directory for convenience.

## Fix

1. Move any wallet material out of the repo tree (e.g. `~/.secrets/` or the
   secret mirror) and delete `monetization/.bootstrap-payer.json`.
2. Add `.bootstrap-payer.json` + `.bootstrap-*.json` to the parent `.gitignore`
   (already partially covered; make it explicit and keep it).
3. Confirm the address holds no funds (0-credit test wallet) and note it as
   burned if it ever received value.

## Verification

- `ls monetization/.bootstrap-payer.json` → not present.
- No test wallet private key material remains in `monetization/scripts/` output paths.

## Impact

Low (wallet holds ~$0), but standing private-key material on disk is a hygiene
and future-leak risk.

## Resolution (2026-10-14)

- `monetization/.bootstrap-payer.json` deleted from the working tree.
- Parent `.gitignore` now explicitly blocks `.bootstrap-payer.json` and
  `.bootstrap-*.json`.