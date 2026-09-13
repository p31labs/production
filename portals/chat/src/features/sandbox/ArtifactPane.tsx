import { useState, useMemo, useEffect, useRef } from 'react';
import { useSandboxStore } from './sandboxStore';
import { useAppStore } from '../../store/useAppStore';
import ArtifactFooter from './ArtifactFooter';
import ConsolePanel from './ConsolePanel';
import ElementInspector from './ElementInspector';
import { createZip } from '../../lib/zip';
import { diffTexts } from '../../lib/diff';
import { trustedHtml } from '../../lib/trustedTypes';
import type { Artifact } from './sandboxStore';
import { remoteMonitor, remoteDeploy, currentThemeTokens } from './remote';

export type MonitorStatus = 'idle' | 'running' | 'done' | 'error';

const DEVICE_WIDTHS = { mobile: 375, tablet: 768, desktop: 0 } as const;
type Device = keyof typeof DEVICE_WIDTHS;

const BRIDGE_SCRIPT = `
  ['log','warn','error'].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments).map(function (a) {
        if (a instanceof Error) return a.message;
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
        catch (e) { return String(a); }
      });
      window.parent.postMessage({ type: 'console', payload: { type: level, args: args } }, window.parent.location.origin);
      original.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (e) {
    window.parent.postMessage({ type: 'console', payload: { type: 'error', args: [(e.message || 'Uncaught error') + (e.lineno ? ' (line ' + e.lineno + ')' : '')] } }, window.parent.location.origin);
  });
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-component], button, input, a, [role="button"]');
    if (!target || target.tagName === 'BODY' || target.tagName === 'HTML') return;
    var selector = target.tagName.toLowerCase() +
      (target.id ? '#' + target.id : '') +
      (target.className && typeof target.className === 'string' ? '.' + target.className.split(' ').join('.') : '');
    window.parent.postMessage({ type: 'element-click', selector: selector, html: target.outerHTML }, window.parent.location.origin);
  });
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'highlight-element') return;
    var prev = document.querySelector('[data-p31-highlight]');
    if (prev) { prev.removeAttribute('data-p31-highlight'); prev.style.outline = ''; }
    if (!e.data.selector) return;
    var el = document.querySelector(e.data.selector);
    if (el) {
      el.setAttribute('data-p31-highlight', '1');
      el.style.outline = '2px solid oklch(62% 0.22 25)';
      el.style.outlineOffset = '2px';
    }
  });
`;

const TOUCH_BRIDGE = `
  (function () {
    function fire(type, target) {
      try {
        target.dispatchEvent(new TouchEvent(type, {
          bubbles: true, cancelable: true,
          touches: [], targetTouches: [], changedTouches: []
        }));
      } catch (e) {}
    }
    document.addEventListener('mousedown', function (e) { fire('touchstart', e.target); }, true);
    document.addEventListener('mouseup', function (e) { fire('touchend', e.target); }, true);
  })();
`;

function wrapFragment(html: string, options: { device?: Device; tokens?: { bg: string; text: string; accent: string } } = {}): string {
  const tokens = { bg: 'oklch(14% 0.014 75)', text: 'oklch(93% 0.012 80)', accent: 'oklch(69% 0.14 45)', ...options.tokens };
  const width = DEVICE_WIDTHS[options.device ?? 'desktop'];
  const viewport = width ? `<meta name="viewport" content="width=${width}">` : '';
  const touch = options.device && options.device !== 'desktop' ? TOUCH_BRIDGE : '';

  if (!/<html|<!DOCTYPE|<body/i.test(html)) {
    return `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    ${viewport}
    <style>
      html,body{margin:0;padding:0;background:transparent;color:${tokens.text};font-family:system-ui,-apple-system,sans-serif}
      .p31-loading { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:var(--p31-glass-bg); backdrop-filter:var(--p31-glass-blur); color:var(--p31-text); font-size:1.2rem; z-index:10; }
    </style>
    <script>${BRIDGE_SCRIPT}</script>
  </head><body>${html}${touch}</body></html>`;
  }

  let out = html;
  if (viewport && /<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${viewport}</head>`);
  }
  const bridge = `<script>${BRIDGE_SCRIPT}</script>${touch}`;
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${bridge}</body>`);
  } else if (/<\/html>/i.test(out)) {
    out = out.replace(/<\/html>/i, `${bridge}</html>`);
  } else {
    out += bridge;
  }
  return out;
}

function computeDiff(prev: string, curr: string): { type: 'added' | 'removed' | 'same'; text: string }[] {
  return diffTexts(prev, curr);
}

function highlightHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /(&lt;\/?)([\w-]+)((?:\s+[\w-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?&gt;)/g,
      (_: string, open: string, tag: string, rest: string) => {
        let result = `${open}<span class="syn-tag">${tag}</span>`;
        result += rest.replace(
          /([\w-]+)(=)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
          (_a: string, attr: string, eq: string, dq: string | undefined, sq: string | undefined, unq: string | undefined) => {
            const value = dq || sq || unq || '';
            return ` <span class="syn-attr">${attr}</span>${eq}"<span class="syn-str">${value}</span>"`;
          }
        );
        return result;
      }
    );
}

type Tab = 'preview' | 'code' | 'diff' | 'inspect';

export default function ArtifactPane() {
  const activeThreadId = useSandboxStore((s) => s.activeThreadId);
  const activeArtifactId = useSandboxStore((s) => s.activeArtifactId);
  const artifacts = useSandboxStore((s) => (s.activeThreadId ? s.artifacts[s.activeThreadId] : undefined) || []);
  const updateCode = useSandboxStore((s) => s.updateArtifactCode);
  const snapshotVersion = useSandboxStore((s) => s.snapshotArtifactVersion);
  const setArtifactMonitor = useSandboxStore((s) => s.setArtifactMonitor);
  const lastDeployUrl = useSandboxStore((s) => s.lastDeployUrl);
  const setLastDeployUrl = useSandboxStore((s) => s.setLastDeployUrl);

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) || null;
  const [tab, setTab] = useState<Tab>('preview');
  const [localCode, setLocalCode] = useState('');
  const [activeVersion, setActiveVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus>('idle');
  const [deploying, setDeploying] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [showConsole, setShowConsole] = useState(false);
  const [htmlError, setHtmlError] = useState<string | null>(null);
  const [lastInspected, setLastInspected] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const debounceRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);
  const codeHighlightRef = useRef<HTMLPreElement>(null);
  const codeLinesRef = useRef<HTMLDivElement>(null);
  const pendingSelRef = useRef<{ start: number; end: number } | null>(null);
  const historyRef = useRef<{ past: { code: string; start: number; end: number }[]; present: { code: string; start: number; end: number }; future: { code: string; start: number; end: number }[] }>({
    past: [],
    present: { code: '', start: 0, end: 0 },
    future: [],
  });

  useEffect(() => {
    if (activeArtifact) {
      setLocalCode(activeArtifact.code);
      setActiveVersion(activeArtifact.versions.length - 1);
      historyRef.current = { past: [], present: { code: activeArtifact.code, start: 0, end: 0 }, future: [] };
      setHistoryTick((t) => t + 1);
    }
  }, [activeArtifact?.id]);

  useEffect(() => {
    const el = codeInputRef.current;
    if (el && pendingSelRef.current) {
      const { start, end } = pendingSelRef.current;
      pendingSelRef.current = null;
      el.focus();
      el.setSelectionRange(start, end);
    }
  }, [localCode]);

  const caret = () => {
    const el = codeInputRef.current;
    return el ? { start: el.selectionStart, end: el.selectionEnd } : { start: 0, end: 0 };
  };

  const setCode = (code: string) => {
    const h = historyRef.current;
    if (code === h.present.code) return;
    const { start, end } = caret();
    h.past = [...h.past, h.present].slice(-50);
    h.present = { code, start, end };
    h.future = [];
    setHistoryTick((t) => t + 1);
    setLocalCode(code);
  };

  const undo = () => {
    const h = historyRef.current;
    if (!h.past.length) return;
    const previous = h.past[h.past.length - 1];
    h.past = h.past.slice(0, -1);
    h.future = [h.present, ...h.future];
    h.present = previous;
    setHistoryTick((t) => t + 1);
    setLocalCode(previous.code);
    pendingSelRef.current = { start: previous.start, end: previous.end };
  };

  const redo = () => {
    const h = historyRef.current;
    if (!h.future.length) return;
    const next = h.future[0];
    h.future = h.future.slice(1);
    h.past = [...h.past, h.present];
    h.present = next;
    setHistoryTick((t) => t + 1);
    setLocalCode(next.code);
    pendingSelRef.current = { start: next.start, end: next.end };
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = codeInputRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = localCode.slice(0, start) + '  ' + localCode.slice(end);
      pendingSelRef.current = { start: start + 2, end: start + 2 };
      setCode(next);
    }
  };

  const handleCodeScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (codeHighlightRef.current) {
      codeHighlightRef.current.scrollTop = el.scrollTop;
      codeHighlightRef.current.scrollLeft = el.scrollLeft;
    }
    if (codeLinesRef.current) {
      codeLinesRef.current.scrollTop = el.scrollTop;
    }
  };

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const runMonitor = async (artifactId: string, code: string) => {
    setMonitorStatus('running');
    const data = await remoteMonitor(code);
    if (data) {
      setArtifactMonitor(artifactId, { score: data.score, duplication_pct: data.duplication_pct, valid: data.valid });
      setMonitorStatus('done');
    } else {
      setMonitorStatus('error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!activeArtifact || localCode === '') return;
    clearTimeout(debounceRef.current);
    setIsLoading(true);
    debounceRef.current = window.setTimeout(() => {
      updateCode(activeArtifact.id, localCode);
      const doc = new DOMParser().parseFromString(wrapFragment(localCode, { tokens: currentThemeTokens() }), 'text/html');
      const parseError = doc.querySelector('parsererror');
      const raw = (parseError?.textContent || '').trim();
      const firstLine = raw.split('\n').map((s) => s.trim()).find((s) => s && !/this page contains/i.test(s));
      setHtmlError(firstLine || (raw ? 'HTML parse error' : null));
      void runMonitor(activeArtifact.id, localCode);
      snapshotVersion(activeArtifact.id);
    }, 700);
    return () => {
      clearTimeout(debounceRef.current);
      setIsLoading(false);
    };
  }, [localCode, activeArtifact?.id]);

  useEffect(() => {
    if (tab === 'preview' && lastInspected && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage({ type: 'highlight-element', selector: lastInspected }, window.location.origin);
    }
  }, [tab, lastInspected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeArtifact) return;
      const target = e.target as HTMLElement | null;
      const inCode = !!target?.closest?.('.artifact-body-code');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        snapshotVersion(activeArtifact.id);
      } else if (mod && e.key.toLowerCase() === 'z') {
        if (inCode) {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
        }
      } else if (mod && e.key.toLowerCase() === 'y') {
        if (inCode) {
          e.preventDefault();
          redo();
        }
      } else if (e.key === 'Escape') {
        setShowConsole(false);
        setHtmlError(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeArtifact?.id]);

  const diffLines = useMemo(() => {
    if (!activeArtifact || activeVersion === 0) return [];
    const prev = activeArtifact.versions[activeVersion - 1]?.code || '';
    return computeDiff(prev, activeArtifact.code);
  }, [activeArtifact?.code, activeVersion]);

  const handleDeploy = async () => {
    if (!activeArtifact || deploying) return;
    setDeploying(true);
    const data = await remoteDeploy(activeArtifact.code, `sandbox-${Date.now()}`);
    if (data?.url) {
      setLastDeployUrl(data.url);
      useAppStore.getState().showToast(`Deployed to ${data.url}`, 'success');
    } else {
      useAppStore.getState().showToast('Deploy failed — worker unreachable', 'error');
    }
    setDeploying(false);
  };

  const handleCopy = () => {
    if (activeArtifact) navigator.clipboard.writeText(activeArtifact.code).catch(() => {});
  };

  const handleDownload = () => {
    if (!activeArtifact) return;
    const blob = new Blob([wrapFragment(activeArtifact.code, { tokens: currentThemeTokens() })], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeArtifact.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportZip = () => {
    if (!activeArtifact) return;
    const slug = activeArtifact.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const blob = createZip([
      { path: 'index.html', content: wrapFragment(activeArtifact.code, { tokens: currentThemeTokens() }) },
      { path: 'README.md', content: `# ${activeArtifact.title}\nGenerated in the P31 Sandbox.\n` },
    ]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInspectorSelect = (selector: string) => {
    setLastInspected(selector);
    window.dispatchEvent(new CustomEvent('p31:element-click', { detail: { selector } }));
    iframeRef.current?.contentWindow?.postMessage({ type: 'highlight-element', selector }, window.location.origin);
  };

  if (!activeArtifact) {
    return (
      <div className="artifact-pane artifact-pane--centered">
        <div className="chat-empty-prompt">
          <span className="artifact-empty-mark" aria-hidden="true" />
          <h3 className="artifact-empty-title">No artifacts yet</h3>
          <p>Start a conversation to generate UI components.</p>
        </div>
      </div>
    );
  }

  const deviceWidth = DEVICE_WIDTHS[device];

  return (
    <div className="artifact-pane">
      <div className="glass-card-title">
        <span className="artifact-icon" aria-hidden="true" />
        <span className="artifact-pane-title-text">{activeArtifact.title}</span>
        {lastDeployUrl && (
          <a href={lastDeployUrl} target="_blank" rel="noopener noreferrer" className="artifact-pane-live-link">
            Live
          </a>
        )}
      </div>

      <div className="artifact-tabs">
        {(['preview', 'code', 'diff', 'inspect'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`artifact-tab${tab === t ? ' artifact-tab--active' : ''}`}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="artifact-body">
        {tab === 'preview' && (
          <div className="artifact-preview-tab">
            <div className="artifact-toolbar">
              <div className="toolbar-group">
                {(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`toolbar-seg${device === d ? ' toolbar-seg--active' : ''}`}
                    onClick={() => setDevice(d)}
                    aria-pressed={device === d}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="toolbar-group">
                <button
                  type="button"
                  className={`toolbar-seg${showConsole ? ' toolbar-seg--active' : ''}`}
                  onClick={() => setShowConsole((s) => !s)}
                  aria-pressed={showConsole}
                >
                  Console
                </button>
              </div>
            </div>
            <div
              className={`artifact-preview-wrapper${device === 'mobile' ? ' artifact-preview-wrapper--mobile' : device === 'tablet' ? ' artifact-preview-wrapper--tablet' : ''}`}
            >
              <iframe
                ref={iframeRef}
                className="artifact-body-iframe"
                srcDoc={wrapFragment(activeArtifact.code, { device, tokens: currentThemeTokens() })}
                sandbox="allow-scripts allow-modals"
                title="Artifact preview"
              />
              {isLoading && (
                <div className="p31-loading-overlay">
                  <div className="p31-loader">Generating…</div>
                </div>
              )}
              {htmlError && (
                <div className="p31-error-overlay">
                  {htmlError}
                  <button type="button" className="p31-error-dismiss" onClick={() => setHtmlError(null)} aria-label="Dismiss error">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
            {showConsole && <ConsolePanel />}
          </div>
        )}
        {tab === 'code' && (
          <div className="artifact-code-tab">
            <div className="artifact-toolbar">
              <div className="toolbar-group">
                <button type="button" className="toolbar-seg" onClick={undo} disabled={!canUndo} aria-label="Undo">Undo</button>
                <button type="button" className="toolbar-seg" onClick={redo} disabled={!canRedo} aria-label="Redo">Redo</button>
              </div>
              <div className="toolbar-group toolbar-hint">
                Ctrl+S snapshot · Ctrl+Z undo
              </div>
            </div>
            <div className="artifact-body-code">
              <div ref={codeLinesRef} className="code-line-numbers" aria-hidden="true">
                {Array.from({ length: Math.max(1, localCode.split('\n').length) }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <pre ref={codeHighlightRef} className="code-highlight-layer" aria-hidden="true">
                <code dangerouslySetInnerHTML={{ __html: trustedHtml(highlightHtml(localCode)) }} />
              </pre>
              <textarea
                ref={codeInputRef}
                className="code-input-layer"
                value={localCode}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleCodeKeyDown}
                onScroll={handleCodeScroll}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>
        )}
        {tab === 'diff' && (
          <div className="artifact-body-diff">
            {activeVersion === 0 ? (
              <p className="diff-hint">Select a previous version to compare.</p>
            ) : !diffLines.some((l) => l.type !== 'same') ? (
              <p className="diff-hint">No differences.</p>
            ) : (
              diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`${line.type === 'added' ? 'diff-line--added' : line.type === 'removed' ? 'diff-line--removed' : ''}${line.type === 'same' ? ' diff-line--same' : ''}`}
                >
                  {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.text}
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'inspect' && (
          <ElementInspector html={activeArtifact.code} onSelect={handleInspectorSelect} />
        )}
      </div>

      <ArtifactFooter
        artifact={activeArtifact}
        activeVersion={activeVersion}
        onVersionClick={setActiveVersion}
        onDeploy={handleDeploy}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onExportZip={handleExportZip}
        monitorStatus={monitorStatus}
        deploying={deploying}
      />
    </div>
  );
}
