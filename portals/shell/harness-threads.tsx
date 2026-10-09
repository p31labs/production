/**
 * harness-threads.tsx — a seeded mount of the real ThreadList, for the
 * sidebar-flicker behavioural gate. Seeds 200 threads directly into the store
 * (no backend), then renders the production ThreadList.
 */
import { createRoot } from 'react-dom/client';
import { ThreadList } from './src/shell/chat/ThreadList';
import { useThreadListStore, bucketOf } from './src/shell/chat/threadListStore';
import './src/index.css';

const threads = Array.from({ length: 200 }, (_, i) => ({
  id: `thread-${String(i).padStart(3, '0')}`,
  lastMessageAt: Date.now() - i * 3_600_000,
  messageCount: (i % 7) + 1,
}));

useThreadListStore.setState({
  threads,
  buckets: threads.map((t) => ({ thread: t, bucket: bucketOf(t.lastMessageAt) })),
  cursor: null,
  hasMore: false,
  inFlight: false,
  activeId: null,
});

function App() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ThreadList />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);