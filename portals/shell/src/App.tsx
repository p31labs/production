/**
 * App.tsx — the shell host. Registers the faces (declarative manifests +
 * component registry) and mounts the shell frame.
 */
import { useShellStore } from './shell/store';
import { registerFaceComponent } from './shell/registry';
import { Shell } from './shell/Shell';
import { AdapterProvider } from './shell/Adapters';
import { StudioFace } from './faces/studio/StudioFace';
import { ChatFace } from './faces/chat/ChatFace';
import { MonetizationFace } from './faces/monetization/MonetizationFace';
import { AuditFace } from './faces/audit/AuditFace';
import { DocsSurface } from './features/docs/components/DocsSurface';
import { SheetsSurface } from './features/sheets/components/SheetsSurface';
import { SlidesSurface } from './features/slides/components/SlidesSurface';
import type { FaceManifest } from './shell/face';

/** The studio face manifest — declarative, agent-reproducible. */
const STUDIO_MANIFEST: FaceManifest = {
  id: 'studio',
  name: 'Studio',
  version: '1.0.0',
  tier: 'declarative',
  themeDefault: 'family',
  wordmark: 'UI Forge',
  search: 'Brain dump → surface',
  action: 'Build',
  actionKind: 'primary',
  nav: [
    { path: '/', label: 'Forge', emoji: '🛠️' },
  ],
  routes: [
    { path: '/', label: 'Forge', component: 'studio-main' },
  ],
  capabilities: { bus: true, identity: true, navigation: true, notification: true, clock: true },
};

/** The monetization face manifest. */
const MONETIZATION_MANIFEST: FaceManifest = {
  id: 'monetization',
  name: 'Monetization',
  version: '1.0.0',
  tier: 'controlled',
  themeDefault: 'family',
  wordmark: 'Capital Machine',
  search: 'Revenue, usage, LOVE',
  action: '',
  actionKind: 'none',
  nav: [
    { path: '/', label: 'Revenue', emoji: '💳' },
  ],
  routes: [
    { path: '/', label: 'Revenue', component: 'monetization-main' },
  ],
  capabilities: { bus: true, identity: true, navigation: true, notification: true, clock: true },
};

/** The audit face manifest — the third face, still just a manifest. */
const AUDIT_MANIFEST: FaceManifest = {
  id: 'audit',
  name: 'Audit',
  version: '1.0.0',
  tier: 'controlled',
  themeDefault: 'family',
  wordmark: 'The Ledger',
  search: 'Events, verify, export',
  action: '',
  actionKind: 'none',
  nav: [
    { path: '/', label: 'Ledger', emoji: '📜' },
  ],
  routes: [
    { path: '/', label: 'Ledger', component: 'audit-main' },
  ],
  capabilities: { bus: true, identity: true, navigation: true, notification: true, clock: true },
};

/** The chat face manifest — the Convergence surface (P31 backend baked in). */
const CHAT_MANIFEST: FaceManifest = {
  id: 'chat',
  name: 'Convergence',
  version: '1.0.0',
  tier: 'declarative',
  themeDefault: 'family',
  wordmark: 'Convergence',
  search: 'Ask the P31 backend',
  action: 'Send',
  actionKind: 'primary',
  nav: [
    { path: '/', label: 'Chat', emoji: '💬' },
  ],
  routes: [
    { path: '/', label: 'Chat', component: 'chat-main' },
  ],
  capabilities: { bus: true, identity: true, navigation: true, notification: true, clock: true },
};

/** The docs face manifest — the extracted Yjs+PGlite collaborative editor. */
const DOCS_MANIFEST: FaceManifest = {
  id: 'docs',
  name: 'Docs',
  version: '1.0.0',
  tier: 'declarative',
  themeDefault: 'family',
  wordmark: 'Documents',
  search: 'Collaborative rich text',
  action: 'New',
  actionKind: 'primary',
  nav: [
    { path: '/', label: 'Docs', emoji: '📄' },
  ],
  routes: [
    { path: '/', label: 'Docs', component: 'docs-main' },
  ],
  capabilities: { bus: true, identity: true, navigation: true, notification: true, clock: true },
};

/** The sheets face manifest. */
const SHEETS_MANIFEST: FaceManifest = {
  id: 'sheets',
  name: 'Sheets',
  version: '1.0.0',
  tier: 'declarative',
  themeDefault: 'family',
  wordmark: 'Sheets',
  search: 'Collaborative spreadsheet',
  action: 'New',
  actionKind: 'primary',
  nav: [
    { path: '/', label: 'Sheets', emoji: '📊' },
  ],
  routes: [
    { path: '/', label: 'Sheets', component: 'sheets-main' },
  ],
  capabilities: { bus: true, identity: true, navigation: true, notification: true, clock: true },
};

/** The slides face manifest. */
const SLIDES_MANIFEST: FaceManifest = {
  id: 'slides',
  name: 'Slides',
  version: '1.0.0',
  tier: 'declarative',
  themeDefault: 'family',
  wordmark: 'Slides',
  search: 'Collaborative deck editor',
  action: 'New',
  actionKind: 'primary',
  nav: [
    { path: '/', label: 'Slides', emoji: '📽️' },
  ],
  routes: [
    { path: '/', label: 'Slides', component: 'slides-main' },
  ],
  capabilities: { bus: true, identity: true, navigation: true, notification: true, clock: true },
};

export default function App() {
  const register = useShellStore((s) => s.register);

  // Register the face component renderers.
  registerFaceComponent('studio-main', StudioFace);
  registerFaceComponent('chat-main', ChatFace);
  registerFaceComponent('monetization-main', MonetizationFace);
  registerFaceComponent('audit-main', AuditFace);
  registerFaceComponent('docs-main', DocsSurface);
  registerFaceComponent('sheets-main', SheetsSurface);
  registerFaceComponent('slides-main', SlidesSurface);

  // Register the faces (idempotent in the store).
  register(STUDIO_MANIFEST);
  register(CHAT_MANIFEST);
  register(MONETIZATION_MANIFEST);
  register(AUDIT_MANIFEST);
  register(DOCS_MANIFEST);
  register(SHEETS_MANIFEST);
  register(SLIDES_MANIFEST);

  return (
    <AdapterProvider>
      <Shell faceIds={['studio', 'chat', 'docs', 'sheets', 'slides', 'monetization', 'audit']} />
    </AdapterProvider>
  );
}