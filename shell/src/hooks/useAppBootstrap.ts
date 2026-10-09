/**
 * @file hooks/useAppBootstrap.ts
 * Bootstrap hook — PGLite, mesh, MCP, ledger hydration
 */

import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { registerShellCommands } from '../lib/commands';
import { requestPersistentStorage, ensureDid } from '../lib/memory';
import { getDB, runMigrations, getLedgerForToday } from '../lib/db';
import { connectLedgerAppender, hydrateFromLedger, type LedgerEntry } from '../features/economy';
import { connectMesh, disconnectMesh } from '../lib/mesh';
import { connectKenosisMesh, disconnectKenosisMesh } from '../lib/kenosis';
import { listTools, ping } from '../lib/mcpClient';

export function useAppBootstrap() {
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    registerShellCommands();
    requestPersistentStorage();

    // Phase 1: PGLite bootstrap — IndexedDB-backed ledger/rules/zones.
    getDB()
      .then(async (db) => {
        await runMigrations(db);
        // Phase 2: persist dual-economy transactions into the ledger table.
        // Route through outbox for offline-first durability.
        connectLedgerAppender(async (entry: LedgerEntry) => {
          const { enqueue } = await import('../lib/outbox');
          await enqueue('ledger-append', entry);
        });
        // Phase 3: replay today's ledger rows so the budget survives refresh.
        const did = await ensureDid().catch(() => '');
        if (did) {
          getLedgerForToday(did)
            .then((rows) => {
              if (rows.length > 0) hydrateFromLedger(rows);
            })
            .catch(() => {});
        }
      })
      .catch(() => { /* best-effort: app still works in-memory */ });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      (window as any).__p31_installPrompt = e;
    });

    ping()
      .then((ok) => {
        if (ok) {
          listTools().catch(() => showToast('MCP tool list failed', 'error'));
        }
      })
      .catch(() => showToast('MCP ping failed', 'error'));
    connectMesh().catch(() => showToast('Mesh connection failed', 'error'));
    connectKenosisMesh().catch(() => showToast('Kenosis mesh failed', 'error'));
    
    return () => { disconnectMesh(); disconnectKenosisMesh(); };
  }, [showToast]);
}
