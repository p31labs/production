import { useState } from 'react';
import { GlassCard, Button } from '@p31ca/design-core/compositions';
import { importTextIntoDoc, importCellsIntoSheet, parseSheetCsv } from '../lib/importGoogle';

/**
 * "Import from Google" — a small flow hosted on the Docs/Sheets surfaces.
 *
 * The bridge (`p31-google-bridge`) supplies exported content:
 *   GET {VITE_GOOGLE_BRIDGE_URL}/api/google/docs/export?id=<docId>    → text
 *   GET {VITE_GOOGLE_BRIDGE_URL}/api/google/sheets/read?id=<sheetId> → { rows: string[][] }
 * If the bridge is unconfigured, the dialog degrades to pasting text/CSV so
 * the materialization path is always testable.
 *
 * Re-implemented from intent — canon GlassCard/Button only; layout via the
 * shell's .import-dialog geometry classes.
 */
export interface ImportGoogleProps {
  kind: 'doc' | 'sheet';
  targetId: string;
  onDone?: () => void;
}

export function ImportGoogleDialog({ kind, targetId, onDone }: ImportGoogleProps) {
  const [mode, setMode] = useState<'bridge' | 'paste'>('bridge');
  const [sourceId, setSourceId] = useState('');
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const bridgeUrl = (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_BRIDGE_URL;

  const runBridge = async () => {
    if (!bridgeUrl || !sourceId) return;
    setBusy(true);
    setMessage('');
    try {
      if (kind === 'doc') {
        const res = await fetch(`${bridgeUrl}/api/google/docs/export?id=${encodeURIComponent(sourceId)}`, {
          credentials: 'include',
        });
        const text = await res.text();
        importTextIntoDoc(targetId, text);
        setMessage('Document imported.');
      } else {
        const res = await fetch(`${bridgeUrl}/api/google/sheets/read?id=${encodeURIComponent(sourceId)}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as { rows?: string[][] };
        importCellsIntoSheet(targetId, data.rows ?? []);
        setMessage('Sheet imported.');
      }
      onDone?.();
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  };

  const runPaste = () => {
    if (!paste.trim()) return;
    if (kind === 'doc') {
      importTextIntoDoc(targetId, paste);
    } else {
      importCellsIntoSheet(targetId, parseSheetCsv(paste));
    }
    setMessage('Pasted content imported.');
    onDone?.();
  };

  return (
    <GlassCard className="import-dialog" data-mcp-tool="importGoogle" data-mcp-state="ready">
      <h3 className="import-dialog__title">Import from Google</h3>
      <div className="import-dialog__modes">
        <Button variant={mode === 'bridge' ? 'primary' : 'ghost'} onClick={() => setMode('bridge')}>
          Bridge
        </Button>
        <Button variant={mode === 'paste' ? 'primary' : 'ghost'} onClick={() => setMode('paste')}>
          Paste
        </Button>
      </div>

      {mode === 'bridge' ? (
        <div className="import-dialog__body">
          <p className="import-dialog__hint">
            {!bridgeUrl
              ? 'The Google bridge is not configured (set VITE_GOOGLE_BRIDGE_URL + bridge credentials).'
              : 'Enter the Google Docs / Sheets id and import.'}
          </p>
          <input
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder={kind === 'doc' ? 'Google Doc id' : 'Google Sheet id'}
            className="import-dialog__input"
            aria-label="Google source id"
          />
          <Button disabled={busy || !bridgeUrl || !sourceId} onClick={() => void runBridge()}>
            {busy ? 'Importing…' : 'Import'}
          </Button>
        </div>
      ) : (
        <div className="import-dialog__body">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={kind === 'doc' ? 'Paste document text…' : 'Paste sheet CSV (one row per line)…'}
            className="import-dialog__textarea"
            aria-label="Content to import"
          />
          <Button disabled={!paste.trim()} onClick={runPaste}>
            Import
          </Button>
        </div>
      )}

      {message && <p className="import-dialog__message">{message}</p>}
    </GlassCard>
  );
}