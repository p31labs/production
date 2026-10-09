/**
 * Playground — the enterprise document playground (creative + fun).
 *
 * Pick a template, edit the markdown (CodeMirror), watch the live render,
 * switch themes, load a jitterbug session, compile, and sign the result
 * with your P31 post-quantum identity.
 *
 * Actions:
 *   - Template: grant / governance / research / legal / corporate
 *   - Editor: split-pane CodeMirror + live preview
 *   - Load session: File System Access API (showDirectoryPicker) with
 *     <input webkitdirectory> fallback for Firefox/Safari
 *   - Theme: Quantum Material switcher (live, no re-render)
 *   - Sign: P31 identity signs the document manifest
 *   - Compile: POST to the forge worker -> .docx
 */
import { useMemo, useState } from 'react';
import { SplitEditor } from '../components/SplitEditor';
import { ThemePicker } from '../components/ThemePicker';
import { useUI } from '../lib/store';
import { getCurrentTheme } from '../lib/theme';
import { wordCount, fkGrade } from '../lib/markdown';
import { loadIdentity, sign } from '../lib/pqc-browser';

type DocType = 'research' | 'grant' | 'governance' | 'legal' | 'corporate';

const TEMPLATES: Record<DocType, { label: string; sample: string }> = {
  research: {
    label: 'Research Report',
    sample: `# Research Report\n\n## Summary\n\nA plain-language summary goes here.\n\n## Consensus\n\n- What the briefs agree on.\n\n## Divergence\n\n- Where they differ.\n\n## Synthesis\n\n- The integrated finding.`,
  },
  grant: {
    label: 'Grant Application',
    sample: `# Grant Application\n\n## The Ask\n\n$50,000 over 24 months.\n\n## Use of Funds\n\n- Founder stipend: $10,500\n- Clinical validation: $2,500`,
  },
  governance: {
    label: 'Governance Memo',
    sample: `# Governance Memo\n\n## Decision\n\nAdopt the sovereign stack governance framework.\n\n## Evidence\n\n- Claim: 21/21 BLOCKING gates proven\n- Source: govern audit`,
  },
  legal: {
    label: 'Legal Brief',
    sample: `# Legal Brief\n\n## Facts\n\n- Fact one.\n\n## Argument\n\n- Argument one.`,
  },
  corporate: {
    label: 'Corporate Resolution',
    sample: `# Board Resolution\n\n## Resolution\n\nRESOLVED, that the Board adopts...`,
  },
};

export default function Playground() {
  const [docType, setDocType] = useState<DocType>('research');
  const [body, setBody] = useState(TEMPLATES.research.sample);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [compileMsg, setCompileMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const spoons = useUI((s) => s.spoons);
  const theme = getCurrentTheme();

  const wc = useMemo(() => wordCount(body), [body]);
  const fk = useMemo(() => fkGrade(body), [body]);

  const pickTemplate = (id: DocType) => { setDocType(id); setBody(TEMPLATES[id].sample); setSessionName(null); setSig(null); };

  async function loadSession() {
    setBusy(true);
    setCompileMsg(null);
    try {
      // File System Access API (Chromium). Fallback: hidden <input webkitdirectory>.
      const picker = (window as unknown as { showDirectoryPicker?: () => Promise<{ values: () => AsyncIterable<{ kind: string; name: string; getFile: () => Promise<File> }> }> }).showDirectoryPicker;
      let mdText: string | null = null;
      let name: string | null = null;
      if (picker) {
        const dir = await picker();
        for await (const entry of dir.values()) {
          if (entry.kind !== 'file' || !entry.name.endsWith('.md')) continue;
          const file = await entry.getFile();
          mdText = await file.text();
          name = entry.name;
          break;
        }
      }
      if (!mdText) {
        // Fallback path: use the file input hidden below.
        const input = document.getElementById('session-input') as HTMLInputElement;
        input.click();
        // The onChange handler reads the file; we set a marker.
        setCompileMsg('Pick a .md file — the file input is open.');
        setBusy(false);
        return;
      }
      setBody(mdText);
      setSessionName(name);
      setSig(null);
      setCompileMsg(`Loaded session: ${name}`);
    } catch (e) {
      setCompileMsg(`Load failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  }

  function handleSessionFile(file: File | null) {
    if (!file) return;
    file.text().then((text) => {
      setBody(text);
      setSessionName(file.name);
      setSig(null);
      setCompileMsg(`Loaded session: ${file.name}`);
    });
  }

  async function handleSign() {
    setBusy(true);
    setSig(null);
    try {
      const identity = await loadIdentity();
      if (!identity) { setCompileMsg('No identity — create one on the Identity surface first.'); return; }
      setDid(identity.did);
      const signature = await sign('p31-forge:' + docType + ':' + wc);
      setSig(signature);
      setCompileMsg('Document manifest signed with ML-DSA-65.');
    } catch (e) {
      setCompileMsg(`Sign failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompile() {
    setBusy(true);
    setCompileMsg(null);
    try {
      // Compile via the forge worker (read-only unless VITE_FORGE_KEY set).
      const key = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_FORGE_KEY ?? '';
      const res = await fetch(`${(import.meta as unknown as { env?: Record<string, string> }).env?.VITE_FORGE_API ?? 'http://localhost:8787'}/compile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(key ? { 'x-forge-key': key } : {}) },
        body: JSON.stringify({ kind: 'memo', filename: `${docType}-${Date.now()}.docx`, title: docType, body: [{ type: 'para', text: body.slice(0, 4000) }] }),
      });
      if (!res.ok) throw new Error(`compile ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${docType}.docx`;
      a.click();
      URL.revokeObjectURL(a.href);
      setCompileMsg('Compiled to .docx');
    } catch (e) {
      setCompileMsg(`Compile: ${e instanceof Error ? e.message : 'worker unreachable (compile is read-only without VITE_FORGE_KEY)'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="route route--playground">
      <header className="page-header">
        <p className="eyebrow">Forge · Playground</p>
        <h1>Document Playground</h1>
        <p className="lede">Pick a template, edit the content, watch it render live, switch themes, sign, compile.</p>
      </header>

      <input id="session-input" type="file" accept=".md" style={{ display: 'none' }} onChange={(e) => handleSessionFile(e.target.files?.[0] ?? null)} />

      <div className="playground-toolbar">
        <div className="doc-type-tabs" role="tablist">
          {(Object.keys(TEMPLATES) as DocType[]).map((id) => (
            <button key={id} role="tab" aria-selected={docType === id} className={`kind-tab ${docType === id ? 'is-active' : ''}`} onClick={() => pickTemplate(id)}>
              {TEMPLATES[id].label}
            </button>
          ))}
        </div>
        <div className="playground-toolbar__right">
          <button className="btn btn--ghost" onClick={loadSession} disabled={busy}>Load jitterbug session</button>
          <ThemePicker />
        </div>
      </div>

      <div className={`playground-stats ${spoons <= 1 ? 'is-calm' : ''}`}>
        <span className="stat">{wc} words</span>
        <span className={`stat ${fk > 14 ? 'stat--warn' : ''}`}>FK {fk.toFixed(1)}{fk > 14 ? ' (dense)' : ''}</span>
        {sessionName && <span className="stat stat--ok">session: {sessionName}</span>}
        {did && <span className="stat stat--ok">signed by {did.slice(0, 24)}…</span>}
      </div>

      <SplitEditor value={body} onChange={setBody} theme={theme} minHeight={spoons <= 1 ? '16rem' : '24rem'} />

      <div className="playground-actions">
        <button className="btn btn--primary" onClick={handleCompile} disabled={busy}>Compile to .docx</button>
        <button className="btn btn--ghost" onClick={handleSign} disabled={busy}>Sign with P31 identity</button>
        {sig && <code className="sig-preview">{sig.slice(0, 40)}…</code>}
        {compileMsg && <p className="hint">{compileMsg}</p>}
      </div>
    </section>
  );
}