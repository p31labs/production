import { useEffect, useState } from 'react';
import { GlassCard, Button } from '@p31/design-core/compositions';
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
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
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
      className="flex-1 bg-transparent text-lg font-semibold text-ink outline-none border-b border-white/10 focus:border-quantum-green/40 py-1 min-w-0"
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
  const { getCell, setCell, dims, setDimensions } = useCollabSheet(activeId ?? '');

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
    <div className="h-full flex flex-col min-h-0" data-mcp-tool="sheetsSurface" data-mcp-state="ready">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-quantum-green font-mono-tech">Sheets</h1>
        <div className="flex gap-2">
          {activeId && (
            <Button variant="ghost" size="sm" onClick={() => setImportOpen((o) => !o)}>
              Import
            </Button>
          )}
          <Button color="green" size="sm" onClick={() => void handleCreate()}>
            + New Sheet
          </Button>
        </div>
      </div>

      {importOpen && activeId && (
        <div className="mb-4">
          <ImportGoogleDialog
            kind="sheet"
            targetId={activeId}
            onDone={() => setImportOpen(false)}
          />
        </div>
      )}

      {!ready ? (
        <div className="text-cloud/40 text-sm">Loading sheets…</div>
      ) : sheets.length === 0 ? (
        <GlassCard className="p-6 text-center text-cloud/50 text-sm">
          No sheets yet. Create your first collaborative grid.
        </GlassCard>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          <aside className="w-56 shrink-0 border-r border-white/5 pr-3 overflow-y-auto space-y-1">
            {sheets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors min-h-[48px] ${
                  activeId === s.id
                    ? 'bg-quantum-green/10 text-quantum-green'
                    : 'text-cloud/60 hover:bg-white/5'
                }`}
              >
                <span className="block truncate">{s.title}</span>
                <span className="block text-xs text-cloud/30 mt-0.5">
                  {new Date(s.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </aside>

          <section className="flex-1 min-w-0 flex flex-col min-h-0">
            {activeId ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <TitleField sheetId={activeId} initial={activeTitle} onCommitted={refresh} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(activeId)}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDimensions(dims.rows + 5, dims.cols)}
                  >
                    + Rows
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDimensions(dims.rows, dims.cols + 2)}
                  >
                    + Cols
                  </Button>
                </div>

                <div className="flex-1 overflow-auto glass-panel rounded-2xl p-2 min-h-0">
                  <div className="flex-1 overflow-auto">
                    <div
                      className="grid gap-px bg-white/5 min-w-max"
                      style={{ gridTemplateColumns: `48px repeat(${dims.cols}, minmax(96px, 1fr))` }}
                      role="grid"
                      aria-label="Sheet grid"
                    >
                      <div className="bg-white/5 text-cloud/40 text-xs flex items-center justify-center sticky top-0 left-0 z-20 min-h-[32px]" />
                      {Array.from({ length: dims.cols }, (_, c) => (
                        <div
                          key={`h-${c}`}
                          className="bg-white/5 text-cloud/40 text-xs font-mono flex items-center justify-center sticky top-0 z-10 min-h-[32px]"
                        >
                          {colLabel(c)}
                        </div>
                      ))}
                      {Array.from({ length: dims.rows }, (_, r) => (
                        <div key={`row-${r}`} className="contents">
                          <div className="bg-white/5 text-cloud/40 text-xs font-mono flex items-center justify-center sticky left-0 z-10 min-h-[32px]">
                            {r + 1}
                          </div>
                          {Array.from({ length: dims.cols }, (_, c) => (
                            <input
                              key={`${r}:${c}`}
                              value={getCell(r, c)}
                              onChange={(e) => setCell(r, c, e.target.value)}
                              onClick={() => setSelected({ r, c })}
                              className={`bg-transparent text-ink text-sm px-2 py-1 outline-none min-w-0 w-full ${
                                selected && selected.r === r && selected.c === c
                                  ? 'ring-2 ring-quantum-green/60 bg-quantum-green/10'
                                  : 'focus:bg-quantum-green/10'
                              }`}
                              aria-label={`Cell ${colLabel(c)}${r + 1}`}
                              spellCheck={false}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 font-mono text-sm border-t border-white/5 pt-2">
                  <span className="text-quantum-green font-semibold w-12">
                    {selected ? `${colLabel(selected.c)}${selected.r + 1}` : '—'}
                  </span>
                  <span className="text-cloud/40 italic">fx</span>
                  <input
                    value={selected ? getCell(selected.r, selected.c) : ''}
                    onChange={(e) => selected && setCell(selected.r, selected.c, e.target.value)}
                    className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-ink outline-none focus:border-quantum-green/40"
                    aria-label="Formula bar"
                    placeholder={selected ? 'Edit cell value…' : 'Select a cell'}
                  />
                </div>
              </>
            ) : (
              <div className="text-cloud/40 text-sm">Select a sheet to edit.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default SheetsSurface;