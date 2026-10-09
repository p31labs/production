<!-- P31-HEADER
id: p31_cardbody_import_dialog_20261004_v1.0
type: plan
component: shell
status: live
retention: archive-90d
created: 2026-10-04T00:00:00Z
owner: will
-->

# Plan: CardBody wrapping for ImportGoogleDialog

## The change
Wrap the GlassCard content in CardBody so the import dialog gets the 24px/8px spacing contract.

## The file
`portals/shell/src/features/import/components/ImportGoogleDialog.tsx`

## The import
Add `CardBody` to the `@p31ca/design-core/compositions` import.

## The gate
`pnpm gate` passes; the diff shows the wrapping.
