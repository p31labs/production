import { useState, useCallback, useRef, useEffect } from 'react';
import { createAkinator, type AkinatorState, type AkinatorResult, type AkinatorItem } from '../lib/akinator';
import { useShellStore } from '../store/useShellStore';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface HistoryStep {
  question: string;
  answer: boolean;
}

export default function AkinatorPanel() {
  const open = useShellStore((s) => s.akinatorOpen);
  const setOpen = useShellStore((s) => s.setAkinatorOpen);

  const engine = useRef(createAkinator());
  const [state, setState] = useState<AkinatorState | null>(null);
  const [result, setResult] = useState<AkinatorResult | null>(null);
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AkinatorItem[]>([]);
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  const start = useCallback(() => {
    const s = engine.current.reset();
    setState(s);
    const r = engine.current.nextQuestion(s);
    setResult(r);
    setHistory([]);
    setSearchResults([]);
  }, []);

  const yes = useCallback(() => {
    if (!state || !result || result.type !== 'question') return;
    setHistory((h) => [...h, { question: result.text, answer: true }]);
    const r = engine.current.answer(state, true);
    setResult(r);
  }, [state, result]);

  const no = useCallback(() => {
    if (!state || !result || result.type !== 'question') return;
    setHistory((h) => [...h, { question: result.text, answer: false }]);
    const r = engine.current.answer(state, false);
    setResult(r);
  }, [state, result]);

  const runAction = useCallback((item: AkinatorItem) => {
    item.action();
    setOpen(false);
  }, [setOpen]);

  const onSearch = useCallback((q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const results = engine.current.search(q);
    setSearchResults(results);
  }, []);

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="akinator-panel-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">🧭</span>
          <h3 className="akinator-title" id="akinator-panel-title">PHOS Oracle</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        <div className="akinator-body">
          {!state && (
            <div className="akinator-start">
              <p className="akinator-intro">
                I can help you find the right shell surface or tool. Just answer a few yes-or-no questions — or search below.
              </p>
              <button type="button" className="btn primary akinator-begin" onClick={start}>
                Begin
              </button>

              <div className="akinator-search-row">
                <input
                  type="text"
                  className="akinator-search-input"
                  placeholder="Or describe what you need…"
                  value={query}
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>

              {searchResults.length > 0 && (
                <ul className="akinator-suggestions">
                  {searchResults.map((item) => (
                    <li key={item.id} className="akinator-suggestion-item">
                      <button type="button" className="akinator-suggestion-btn" onClick={() => runAction(item)}>
                        <span className="akinator-suggestion-emoji">{item.emoji}</span>
                        <div className="akinator-suggestion-body">
                          <div className="akinator-suggestion-name">{item.name}</div>
                          <div className="akinator-suggestion-desc">{item.description}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {state && result && (
            <>
              <div className="akinator-progress" role="progressbar" aria-valuenow={state.candidates.length} aria-valuemin={0} aria-valuemax={14}>
                {[...Array(Math.min(6, history.length + 1))].map((_, i) => (
                  <span key={i} className={`akinator-dot${i <= history.length ? ' filled' : ''}`} />
                ))}
              </div>

              {history.length > 0 && (
                <div className="akinator-history">
                  {history.slice(-4).map((h, i) => (
                    <div key={i} className="akinator-history-step">
                      <span className="akinator-history-icon">{h.answer ? '✓' : '✗'}</span>
                      <span className="akinator-history-text">{h.question}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.type === 'question' && (
                <div className="akinator-question-card">
                  <div className="akinator-question-label">Q{history.length + 1}</div>
                  <p className="akinator-question-text">{result.text}</p>
                  <div className="akinator-candidates-hint">{result.candidates} possible matches</div>
                  <div className="akinator-buttons">
                    <button type="button" className="btn ghost akinator-btn-no" onClick={no}>No</button>
                    <button type="button" className="btn primary akinator-btn-yes" onClick={yes}>Yes</button>
                  </div>
                </div>
              )}

              {result.type === 'suggestions' && (
                <div className="akinator-suggestions">
                  <p className="akinator-suggestions-title">
                    {result.apps.length > 0 ? 'I think you might want…' : 'No matches found — try searching instead.'}
                  </p>
                  <ul className="akinator-suggestions-list">
                    {result.apps.map((app) => (
                      <li key={app.id} className="akinator-suggestion-item">
                        <button type="button" className="akinator-suggestion-btn" onClick={() => runAction(app)}>
                          <span className="akinator-suggestion-emoji">{app.emoji}</span>
                          <div className="akinator-suggestion-body">
                            <div className="akinator-suggestion-name">{app.name}</div>
                            <div className="akinator-suggestion-desc">{app.description}</div>
                            <div className="akinator-suggestion-confidence">{app.confidence}% confidence</div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {result.apps.length === 0 && (
                    <div className="akinator-search-row" style={{ marginTop: 12 }}>
                      <input
                        type="text"
                        className="akinator-search-input"
                        placeholder="Describe what you need…"
                        value={query}
                        onChange={(e) => onSearch(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <ul className="akinator-suggestions-list">
                          {searchResults.map((item) => (
                            <li key={item.id} className="akinator-suggestion-item">
                              <button type="button" className="akinator-suggestion-btn" onClick={() => runAction(item)}>
                                <span className="akinator-suggestion-emoji">{item.emoji}</span>
                                <div className="akinator-suggestion-body">
                                  <div className="akinator-suggestion-name">{item.name}</div>
                                  <div className="akinator-suggestion-desc">{item.description}</div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <button type="button" className="btn ghost akinator-restart" onClick={start}>Start over</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
