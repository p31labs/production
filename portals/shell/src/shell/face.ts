/**
 * face.ts — the face manifest contract.
 *
 * A FACE is a manifest, not code. It declares what a face shows and needs;
 * the shell supplies the adapters and renders the frame. An agent can
 * register a new face by writing a JSON-serializable manifest — no shell
 * code changes. This is the reproducibility guarantee.
 *
 * Ownership line (the invariant):
 *   The SHELL owns geometry, slot order, theme engine, identity fence
 *   position, error boundary, ambient canvas, event bus, and adapter wiring.
 *   The FACE owns wordmark, search, action, nav, routes, and the adapter
 *   capabilities it requires.
 *   Nothing crosses that line. validateFaceOwnership enforces it.
 */

/** A nav item a face declares for the shell chrome. */
export interface FaceNavItem {
  path: string;
  label: string;
  emoji?: string;
}

/** A route the face declares; `component` is the lazy renderer key the shell
 *  resolves from its face registry (config references a registered renderer,
 *  never inline code). */
export interface FaceRoute {
  path: string;
  label: string;
  component: string;
  /** Optional A2UI-style block placements for this route (declarative only). */
  blocks?: FaceBlockPlacement[];
}

/** A declarative block placement (the A2UI pattern): a block id + props. */
export interface FaceBlockPlacement {
  blockId: string;
  props?: Record<string, unknown>;
}

/** The adapter capabilities a face requires. The shell injects these; a face
 *  that declares a capability receives the adapter via context. */
export interface FaceCapabilities {
  /** Event bus (subscribe/publish to the normalized stream). */
  bus?: boolean;
  /** Identity (did, role, sign). */
  identity?: boolean;
  /** Navigation (route within the shell). */
  navigation?: boolean;
  /** Notification (toast). */
  notification?: boolean;
  /** Clock (current time / session). */
  clock?: boolean;
}

/** The face manifest — one shape for every tier (additive-only). */
export interface FaceManifest {
  id: string;
  name: string;
  version: string;
  /** Controlled | Declarative | Open — which generative-UI tier the face uses. */
  tier: 'controlled' | 'declarative' | 'open';
  /** Theme default — applied only on first load if the user never picked. */
  themeDefault?: string;
  wordmark: string;
  search: string;
  action: string;
  actionKind: 'primary' | 'ghost' | 'none';
  nav: FaceNavItem[];
  routes: FaceRoute[];
  capabilities?: FaceCapabilities;
  /** Remote entry (T2 federation): a URL + integrity hash. Loaded via
   *  loadRemoteFace with SRI verification when present; otherwise the face
   *  renders from the local registry. */
  entryPoint?: string;
  integrity?: string;
}

/** Fields a face may declare. Anything else is a contract violation — the
 *  shell owns geometry and rejects layout-affecting overrides. */
export const FACE_ALLOWED_FIELDS = [
  'id', 'name', 'version', 'tier', 'themeDefault', 'wordmark', 'search',
  'action', 'actionKind', 'nav', 'routes', 'capabilities', 'entryPoint', 'integrity',
] as const;

/** Layout tokens a face must NEVER declare (the shell owns them). */
const GEOMETRY_OVERRIDES = [
  'topbarHeight', 'topbar-height', 'sidebarWidth', 'sidebar-width',
  '--space-', '--radius-', '--topbar-height', '--sidebar-width',
];

/** Validate that a manifest respects the ownership line. Returns the list of
 *  violations (empty = compliant). Both the shell mount and the composer
 *  consult this — one rule, same everywhere. */
export function validateFaceOwnership(m: Partial<FaceManifest>): string[] {
  const violations: string[] = [];
  if (!m || typeof m !== 'object') return ['manifest is not an object'];
  if (typeof m.id !== 'string' || !m.id) violations.push('id is required (string)');
  if (typeof m.name !== 'string' || !m.name) violations.push('name is required (string)');
  if (typeof m.wordmark !== 'string') violations.push('wordmark is required (string)');
  if (typeof m.tier !== 'string' || !m.tier) {
    // tier is optional — normalize fills 'controlled'. Only reject an
    // explicitly-provided-but-invalid tier.
    if (m.tier !== undefined && m.tier !== '') violations.push("tier must be 'controlled' | 'declarative' | 'open'");
  } else if (!['controlled', 'declarative', 'open'].includes(m.tier)) {
    violations.push("tier must be 'controlled' | 'declarative' | 'open'");
  }
  for (const key of Object.keys(m)) {
    if (!FACE_ALLOWED_FIELDS.includes(key as (typeof FACE_ALLOWED_FIELDS)[number])) {
      violations.push(`unknown field: ${key}`);
    }
  }
  for (const geo of GEOMETRY_OVERRIDES) {
    if (geo in m) violations.push(`geometry override not allowed: ${geo}`);
  }
  if (m.nav !== undefined && !Array.isArray(m.nav)) violations.push('nav must be an array');
  if (m.routes !== undefined && !Array.isArray(m.routes)) violations.push('routes must be an array');
  return violations;
}

/** A face manifest with all required fields filled (for the registry). */
export function normalizeFaceManifest(m: Partial<FaceManifest>): FaceManifest {
  const violations = validateFaceOwnership(m);
  if (violations.length > 0) {
    throw new Error(`invalid face manifest: ${violations.join('; ')}`);
  }
  return {
    id: m.id!,
    name: m.name!,
    version: m.version ?? '0.0.1',
    tier: m.tier ?? 'controlled',
    themeDefault: m.themeDefault,
    wordmark: m.wordmark!,
    search: m.search ?? '',
    action: m.action ?? '',
    actionKind: m.actionKind ?? 'none',
    nav: m.nav ?? [],
    routes: m.routes ?? [],
    capabilities: m.capabilities ?? {},
    entryPoint: m.entryPoint,
    integrity: m.integrity,
  };
}