# fix: cli/love-registry.js love_balance schema carried `required: true` inside a property object

<!-- P31-HEADER
id: p31_fix_plan_love_registry_malformed_required_schema_20261011_v1.0
type: fix-plan
component: cli/love-registry.js
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`love_balance`'s hand-rolled `inputSchema` declared `userId: { type: 'string',
required: true }` — `required` INSIDE a property object. That is invalid JSON
Schema (the keyword belongs at the object level as an array of strings). The
SDK v2 swap surfaced it: `fromJsonSchema` compiles the schema with the
AJV-backed validator at tool registration, and AJV (strict mode) throws
`required value must be ["array"]`, which failed the entire server
(`-32603 Internal server error` on every request).

## Root cause

Hand-authored schema bug that no runtime ever validated — the hand-rolled
transport emitted the schema verbatim and never parsed it.

## Fix

Removed the malformed `required: true` key from the `userId` property object.
Behavior is unchanged: the `love_balance` handler already treats `userId` as
optional (`args.userId || process.env.P31_USER_ID || 'guest'`), so no
`required` constraint existed in practice. The advertised schema now matches
the actual handler semantics and passes the SDK validator.

## Evidence

- `node -e "fromJsonSchema({type:'object',properties:{userId:{type:'string',required:true}}})"` → throws `required value must be ["array"]` (pre-fix).
- Post-fix live probe: `initialize` → `tools/list` → `tools/call` all succeed on cli/love-registry.js.
- Surface diff vs pre-swap snapshot: exactly one tool changed — `love_balance`'s `userId` no longer carries the invalid `required: true` key. All other 3 tools byte-identical.