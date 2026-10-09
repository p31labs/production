/**
 * harness-artifacts.tsx — a parent that re-renders many times (ticking state)
 * while passing UNCHANGED artifact props to the memoized ArtifactPane. The
 * memoization behavioural gate asserts the pane's render count does not grow
 * with the parent's tick count.
 */
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { ArtifactPane } from './src/shell/chat/ArtifactPane';
import './src/index.css';

const CONTENT = '<!doctype html><html><body><h1>Hello</h1></body></html>';

function App() {
  const [tick, setTick] = useState(0);
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <button id="tick" type="button" onClick={() => setTick((t) => t + 1)}>tick ({tick})</button>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ArtifactPane kind="html" title="Hello" content={CONTENT} version={1} versionCount={1} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);