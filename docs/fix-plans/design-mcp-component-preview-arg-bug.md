# fix: ui://p31/component/* resources always rendered "not found" — arg-shape bug in componentPreviewHtmlInline

<!-- P31-HEADER
id: p31_fix_plan_design_mcp_component_preview_arg_bug_20261012_v1.0
type: fix-plan
component: workers/design-mcp
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

## Symptom

`componentPreviewHtmlInline` (`workers/design-mcp/src/handlers/tools.ts:150`)
takes `args: { name: string }`, but the hand-rolled `resources/read`
handler in `workers/design-mcp/src/index.ts` called it with a bare string:
`componentPreviewHtmlInline(name)`. `String(args.name || '')` therefore
resolved to `''` on every call, so every advertised preview resource
(`ui://p31/component/button`, `chat-composer`, `chat-message`,
`glass-panel`, `artifact-pane`, and every `ui://p31/component/<name>` read)
answered
`<div>Component "" not found.</div>` — the five preview resources in
`resources/list` were effectively dead. Discovered 2026-10-12 while porting
the resource reads to the SDK v2 APIs (the swap's mandate is dispatch
replacement, not behavior change, so this is filed separately).

## Resolution — 2026-10-12 (fixed in the SDK-v2 swap wave)

The SDK-v2 resource callbacks now pass the argument correctly
(`componentPreviewHtmlInline({ name: previewName(name) })`) and emit the
returned `html` as the resource `text` (the hand-rolled path serialized the
whole `{ html, status }` object as `text`, which also violates the
`text: string` resource shape). `previewName` resolves the advertised
lowercase slugs case-insensitively against the PascalCase `COMPONENT_DEFS`
keys, so `ui://p31/component/button` renders the Button preview.

- **Evidence:** local SDK-handler probe before/after: before, the read
  answered `<div>Component "" not found.</div>`; after,
  `<div class="component-preview" data-component="Button" data-css-class="btn"
  data-category="action">…`. Live probe on the deployed worker
  (`abf8be96-5d0a-4dd0-b556-7ca887cc108a`, 2026-10-12): 200 with the real
  preview HTML. Unknown slugs still render the not-found div (fail-soft,
  unchanged shape).
- `npx tsc --noEmit` green; vitest suite green (85/85).