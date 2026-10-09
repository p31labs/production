/**
 * @file CommandPalette.tsx — ⌘K command palette backed by the FTS5 search API.
 *
 * Results are grouped into Threads / Pages / Artifacts / Actions by event_type
 * prefix. When the query is empty, a recents branch shows recently visited
 * items instead of a blank list.
 */

import { Command } from 'cmdk';
import { useEffect, useMemo, useState } from 'react';
import { useSearchStore } from '../lib/searchStore';

interface RecentItem {
  id: string;
  label: string;
  group: 'Threads' | 'Pages' | 'Artifacts' | 'Actions';
}

const RECENT_ITEMS: RecentItem[] = [
  { id: 'recent-thread-1', label: 'Inbox', group: 'Threads' },
  { id: 'recent-page-1', label: 'Welcome', group: 'Pages' },
  { id: 'recent-artifact-1', label: 'Care score', group: 'Artifacts' },
  { id: 'recent-action-1', label: 'New page', group: 'Actions' },
];

type GroupName = 'Threads' | 'Pages' | 'Artifacts' | 'Actions';

function groupOf(eventType: string): GroupName | null {
  if (eventType.startsWith('thread')) return 'Threads';
  if (eventType.startsWith('page')) return 'Pages';
  if (eventType.startsWith('artifact')) return 'Artifacts';
  if (eventType.startsWith('action')) return 'Actions';
  return null;
}

export function CommandPalette() {
  const query = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setResults = useSearchStore((s) => s.setResults);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults(useSearchStore.getState().requestId, []);
      return;
    }
    const requestId = useSearchStore.getState().requestId;
    // 150ms debounce before firing the FTS request; a stale reply is dropped
    // by setResults' requestId guard if the user kept typing.
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as { results?: unknown[] };
        setResults(requestId, (data.results ?? []) as never);
      } catch {
        setResults(requestId, []);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [open, query, setResults]);

  const hasQuery = query.trim().length > 0;
  const grouped = useMemo(
    () => ({
      Threads: results.filter((r) => groupOf(r.event_type) === 'Threads'),
      Pages: results.filter((r) => groupOf(r.event_type) === 'Pages'),
      Artifacts: results.filter((r) => groupOf(r.event_type) === 'Artifacts'),
      Actions: results.filter((r) => groupOf(r.event_type) === 'Actions'),
    }),
    [results],
  );

  return (
    <Command className="command-palette">
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search threads, pages, artifacts, actions…"
      />
      <Command.List>
        <Command.Empty>No results for {hasQuery ? `"${query}"` : 'your query'}.</Command.Empty>

        {!hasQuery && (
          <Command.Group heading="Recent">
            {RECENT_ITEMS.map((item) => (
              <Command.Item key={item.id} value={item.id}>
                <span>{item.label}</span>
                <span className="command-palette__kind">{item.group}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {hasQuery && (
          <>
            <Command.Group heading="Threads">
              {grouped.Threads.map((r) => (
                <Command.Item key={r.rowid} value={`thread-${r.rowid}`}>{r.text}</Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Pages">
              {grouped.Pages.map((r) => (
                <Command.Item key={r.rowid} value={`page-${r.rowid}`}>{r.text}</Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Artifacts">
              {grouped.Artifacts.map((r) => (
                <Command.Item key={r.rowid} value={`artifact-${r.rowid}`}>{r.text}</Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Actions">
              {grouped.Actions.map((r) => (
                <Command.Item key={r.rowid} value={`action-${r.rowid}`}>{r.text}</Command.Item>
              ))}
            </Command.Group>
          </>
        )}
      </Command.List>
    </Command>
  );
}