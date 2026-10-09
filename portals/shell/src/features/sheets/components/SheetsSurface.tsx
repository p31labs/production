/**
 * SheetsSurface — the sheets face, re-implemented from intent (see
 * docs/surface-spec.md). Container layer (sheetStore/useCollabSheet) kept;
 * presentation rebuilt with canon compositions only. Zero QPJ classes,
 * zero Tailwind, zero CSS imports.
 */
import { useEffect, useState } from 'react';
import { GlassPanel, GlassCard, CardBody, Button } from '@p31ca/design-core/compositions';
import { useCollabSheet } from '../hooks/useCollabSheet';
import {
  createSheet,
  deleteSheet,
  listSheets,
  renameSheet,
  type SheetMeta,
} from '../lib/sheetStore';
import { ImportGoogleDialog } from '../../import/components/ImportGoogleDialog';

function colLabel(col: number): string {
  let label = '';
  let n = col;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function TitleField({
  sheetId,
  initial,
  onCommitted,
}: {
  sheetId: string;
  initial: string;
  onCommitted: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial, sheetId]);
  const commit = () => {
    const next = draft.trim();
    if (next && next !== initial) void renameSheet(sheetId, next).then(onCommitted);
    else if (!next) setDraft(initial);
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(initial);
      }}
      className="docs-title"
      aria-label="Sheet title"
    />
  );
}

export function SheetsSurface() {
  const [sheets, setSheets] = useState<SheetMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const { getCell, setCell, dims } = useCollabSheet(activeId ?? '');

  const refresh = async () => setSheets(await listSheets());

  useEffect(() => {
    let cancelled = false;
    void listSheets().then((list) => {
      if (cancelled) return;
      setSheets(list);
      setReady(true);
      if (list.length > 0) setActiveId(list[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    const title = window.prompt('Sheet name', 'Untitled');
    if (title === null) return;
    const id = await createSheet(title.trim() || 'Untitled');
    await refresh();
    setActiveId(id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sheet?')) return;
    await deleteSheet(id);
    if (activeId === id) setActiveId(null);
    await refresh();
  };

  const activeTitle =
    sheets.find((s) => s.id === activeId)?.title ?? (activeId ? 'Untitled' : '');

  return (
    <GlassPanel className="docs-surface" data-mcp-tool="sheetsSurface" data-mcp-state="ready">
      <div className="docs-head">
        <h1 className="docs-head__title">Sheets</h1>
        <div className="docs-actions">
          {activeId && (
            <Button variant="ghost" onClick={() => setImportOpen((o) => !o)}>
              Import
            </Button>
          )}
          <Button variant="primary" onClick={() => void handleCreate()}>
            + New Sheet
          </Button>
        </div>
      </div>

      {importOpen && activeId && (
        <div className="docs-import">
          <ImportGoogleDialog
            kind="sheet"
            targetId={activeId}
            onDone={() => setImportOpen(false)}
          />
        </div>
      )}

      {!ready ? (
        <div className="docs-empty">Loading sheets…</div>
      ) : sheets.length === 0 ? (
        <GlassCard>
          <CardBody>
            <p>No sheets yet. Create your first.</p>
          </CardBody>
        </GlassCard>
      ) : (
        <div className="docs-body">
          <aside className="docs-list">
            {sheets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`docs-item${activeId === s.id ? ' is-active' : ''}`}
              >
                <span className="docs-item__title">{s.title}</span>
                <span className="docs-item__date">
                  {new Date(s.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </aside>

          <section className="docs-editor">
            {activeId ? (
              <>
                <div className="docs-editor__head">
                  <TitleField sheetId={activeId} initial={activeTitle} onCommitted={refresh} />
                  <Button variant="ghost" onClick={() => void handleDelete(activeId)}>
                    Delete
                  </Button>
                </div>

                <div className="sheets-gridwrap">
                  <div
                    className="sheets-grid"
                    style={{ gridTemplateColumns: `48px repeat(${dims.cols}, minmax(96px, 1fr))` }}
                    role="grid"
                    aria-label="Sheet grid"
                  >
                    <div className="sheets-corner" />
                    {Array.from({ length: dims.cols }, (_, c) => (
                      <div key={`h-${c}`} className="sheets-colhead">
                        {colLabel(c)}
                      </div>
                    ))}
                    {Array.from({ length: dims.rows }, (_, r) => (
                      <div key={`row-${r}`} className="contents">
                        <div className="sheets-rowhead">{r + 1}</div>
                        {Array.from({ length: dims.cols }, (_, c) => (
                          <input
                            key={`${r}:${c}`}
                            value={getCell(r, c)}
                            onChange={(e) => setCell(r, c, e.target.value)}
                            onClick={() => setSelected({ r, c })}
                            className={`sheets-cell${selected && selected.r === r && selected.c === c ? ' is-selected' : ''}`}
                            aria-label={`Cell ${colLabel(c)}${r + 1}`}
                            spellCheck={false}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sheets-fx">
                  <span className="sheets-fx__ref">
                    {selected ? `${colLabel(selected.c)}${selected.r + 1}` : '—'}
                  </span>
                  <span className="sheets-fx__fx">fx</span>
                  <input
                    value={selected ? getCell(selected.r, selected.c) : ''}
                    onChange={(e) => selected && setCell(selected.r, selected.c, e.target.value)}
                    className="sheets-fx__input"
                    aria-label="Formula bar"
                    placeholder={selected ? 'Edit cell value…' : 'Select a cell'}
                  />
                </div>
              </>
            ) : (
              <div className="docs-empty">Select a sheet to edit.</div>
            )}
          </section>
        </div>
      )}
    </GlassPanel>
  );
}

export default SheetsSurface;