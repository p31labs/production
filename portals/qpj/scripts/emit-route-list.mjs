#!/usr/bin/env node
/**
 * Emits public/routes.json — the deploy-time smoke table for the QPJ app.
 * Derives from src/lib/routes.ts (single source of truth). Falls back to a
 * mirrored table only if the import fails, so prebuild never bricks.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FALLBACK = [
  { hash: '#/', minMode: 'spark', label: 'street' },
  { hash: '#/street', minMode: 'spark', label: 'street' },
  { hash: '#/entry', minMode: 'spark', label: 'entry' },
  { hash: '#/talk', minMode: 'spark', label: 'talk' },
  { hash: '#/you', minMode: 'spark', label: 'you' },
  { hash: '#/craft', minMode: 'maker', label: 'craft' },
  { hash: '#/workshop', minMode: 'workshop', label: 'workshop' },
  { hash: '#/switch', minMode: 'spark', label: 'switch' },
];

let routes;
try {
  const src = await import('../src/lib/routes.ts');
  routes = [
    { hash: '#/', minMode: src.ROUTES.street.minMode, label: 'street' },
    ...src.ROUTE_ORDER.map((key) => {
      const r = src.ROUTES[key];
      return { hash: r.hash, minMode: r.minMode, label: key };
    }),
  ];
} catch {
  routes = FALLBACK;
}

const outDir = join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'routes.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), routes }, null, 2)
);
console.log('[emit-route-list] wrote public/routes.json');