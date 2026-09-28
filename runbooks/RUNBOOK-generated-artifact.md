# RUNBOOK-generated-artifact

## When to use
You are about to edit a file that may be generated, or you found a file under
`generated/`, `dist/`, or with a `*.wc.js` / `*.test.tsx` suffix whose origin is
unclear.

## Prerequisites
- Know whether the file has a generator (grep for the filename in `scripts/`
  and `src/generator/`).

## Steps
1. Grep for the file's basename across `src/`, `scripts/`, manifests, and docs.
2. If a generator references it → edit the generator, then regenerate. Never
   hand-edit.
3. If NO generator references it → it is orphaned. Add to `.gitignore` or
   delete, after confirming zero references.
4. After any deletion, run the generator and `git status` — if the file
   reappears, the generator still emits it; fix the generator, do not re-delete.

## How to verify
`grep -rn "<basename>" src/ scripts/ docs/` returns zero hits (or hits only in
the file's own generator). `git status --short` shows no reappearance after
regeneration.

## Common pitfalls
- **Hand-editing a generated file to "save a regeneration round-trip."** The
  file persists with no generator and no provenance; the next agent can't tell
  it's stale. (Incident: 15 orphaned `src/generated/*.test.tsx` in design-core;
  the stale `CommandPalette.wc.js`.)
- **Two files with the same name in different packages.** `theme-store.ts`
  exists in both `canon/src/theming/` (pure data) and
  `design-core/src/theming/` (a zustand store). Same name, different content,
  different roles. Verify which one you mean before editing.

## Owner + last verified
`Owner: design-core` · `Last verified: 2026-09-28`