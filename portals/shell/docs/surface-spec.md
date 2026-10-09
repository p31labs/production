# Surface Spec — Docs, Sheets, Slides (P31 Shell)

The intent contract for the re-implemented knowledge faces. This is the
design-system-agnostic artifact that shapes the new surfaces. It names data,
actions, and regions — **never CSS classes, never pixel values, never Tailwind**.

## Docs

**Data**
- A Yjs doc per document: `Y.XmlFragment('prosemirror')` = rich-text body,
  `meta` Y.Map = title. Persisted to PGlite `documents` table (bytea).
- CRDT sync: BroadcastChannel same-device, doc-relay WS cross-device (opt-in).
- Container APIs (kept): `listDocuments/createDocument/renameDocument/deleteDocument/getDoc/persistDoc`, `useCollabText(docId)` → `{ editorRef }`, `useDocOutline`, `forgeExportDoc(docId, theme)`.

**User actions**
1. Create a new document.
2. Open a document (select from list).
3. Rename the active document.
4. Delete a document.
5. Import content from Google (text/CSV via dialog).
6. Export the active document via the Forge (docx, hub/scene theme).

**Regions**
- A left region listing documents (title, updatedAt, active state).
- A primary region: the editor mount (ProseMirror) + the title field.
- An action row above the editor: New, Import, Export·Forge.
- An optional right region: the heading outline (desktop).

**Shape rule** (from content): the doc list is *content* (selectable items); the
editor is the *focus*; the actions are *utilities*. The surface leads with the
editor when a doc is open, and with the list when none is selected.

## Sheets

**Data**
- A Yjs doc per sheet: `Y.Map<string,string>` grid (key `"row:col"`) + `meta`.
  Persisted to PGlite `sheets` table (bytea). Same sync pattern.
- Container APIs (kept): `createSheet/listSheets/renameSheet/deleteSheet/getSheetDoc/getSheetAwareness/persistSheet`, `useCollabSheet(sheetId)`.

**User actions**
1. Create a sheet. 2. Open/select a sheet. 3. Edit cells (grid). 4. Rename/delete.
5. Import CSV via the Google dialog.

**Regions**
- A list region (sheets).
- A grid region (editable cells) + column/row labels.
- An action row: New, Import.

**Shape rule**: the grid is the focus; the list is navigation; actions are utilities.

## Slides

**Data**
- A Yjs doc per deck: `Y.Array` of slides (each a `Y.Map` with `title`/`body`
  Y.Text). Persisted to PGlite `slide_decks` table (bytea). Same sync.
- Container APIs (kept): `createDeck/listDecks/renameDeck/deleteDeck/getDeckDoc`, `useCollabSlides(deckId)`.

**User actions**
1. Create a deck. 2. Open/select a deck. 3. Edit slide title/body. 4. Present
(fullscreen). 5. Rename/delete.

**Regions**
- A list region (decks).
- An editor region (current slide title/body).
- A presentation trigger (fullscreen).
- An action row: New, Present.

**Shape rule**: the editor is the focus; the list is navigation; Present is the escape.

## The canon mapping (appearance is canon-owned)

| Region (intent) | Canon composition |
|---|---|
| Surface frame | `GlassPanel` |
| List item / card | `GlassCard` (title + metadata) |
| Primary action | `Button` (primary) |
| Secondary action | `Button` (ghost) |
| Metadata / state | `StatusBadge` / `MetricBadge` |
| Grouped content | `Card` |
| Editor / grid / slide mount | a plain `<div ref>` carrying canon tokens — the only raw element, never a styled class |

## Invariants

- The face imports **zero CSS**. Theme inheritance is via `var(--p31-*)`.
- The face uses **no Tailwind**, no QPJ class names, no styled divs.
- The only raw element is the interactive mount (editor/grid) — and it carries
  canon tokens, never QPJ utility classes.
- If a region needs a variant the canon lacks → extend canon (design-core),
  never fork in the shell.