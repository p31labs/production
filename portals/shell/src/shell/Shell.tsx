/**
 * shell/Shell.tsx — the shell frame.
 *
 * The invariant chrome every face renders inside: skip-link, ambient mount,
 * header (face switcher + wordmark), main workspace (active face route),
 * mobile nav, and overlay slots. The shell owns geometry; the face owns
 * content. Faces are rendered through the component registry (declarative).
 *
 * This is a fresh build — the canon compositions are used only as adapters
 * for chrome primitives (not as the shell's own structure).
 */
import { useEffect, useMemo } from 'react';
import { useShellStore, resolveShellTheme } from './store';
import { resolveFaceComponent, UnknownFaceComponent } from './registry';
import type { FaceManifest } from './face';
import { FaceSwitcher } from './FaceSwitcher';
import { ShellChrome, ShellSpoonDial, ThemeCharmButton } from './ShellChrome';
import { ShellCommandPalette } from './ShellCommandPalette';
import { useAdapters } from './adapters';
import { canAccessSurface, SURFACE_ROLE_FLOOR } from './surface-registry';

/** A face the actor cannot open. Two cases, two tones: no identity at all is
 *  an invitation (the owner bootstrap auto-creates one on first arrival, so
 *  this renders only when keygen is blocked); a role below the floor is a
 *  genuine denial. */
function FaceForbidden({ face, floor }: { face: FaceManifest; floor: string }) {
  const { identity } = useAdapters();
  if (identity.role === null) {
    return (
      <div className="shell-fallback" role="status">
        <p className="shell-fallback__title">This face opens when you name yourself.</p>
        <p className="shell-fallback__detail">
          <span>An identity is created on first arrival. If this persists, this browser may be blocking key generation — a secure context is required.</span>
        </p>
      </div>
    );
  }
  return (
    <div className="shell-fallback" role="status">
      <p className="shell-fallback__title">This surface requires a higher role.</p>
      <p className="shell-fallback__detail">
        <span>"{face.name}" needs </span>
        <code>{floor}</code>
        <span> or above.</span>
      </p>
    </div>
  );
}

export interface ShellProps {
  /** The face ids to show in the switcher (registry order otherwise). */
  faceIds?: string[];
  /** Ambient background node (optional — the shell reserves the mount). */
  ambient?: React.ReactNode;
  /** Overlay extras — palette/calm/notification nodes. */
  extras?: React.ReactNode;
}

/** A single face route renderer. Falls back gracefully when unknown, and
 *  refuses a face whose role floor the actor does not meet. */
function FaceRoute({ face }: { face: FaceManifest }) {
  const { identity } = useAdapters();

  // Hydration guard: don't fail a face closed before the passport resolves.
  if (!identity.ready) {
    return (
      <div className="shell-fallback" role="status">
        <p className="shell-fallback__title">Waking up…</p>
      </div>
    );
  }

  // The authorization wiring: a face with a role floor below the actor's role
  // renders the forbidden fallback, never a half-authorized face.
  const floor = SURFACE_ROLE_FLOOR[face.id];
  if (floor && !canAccessSurface(identity.role, face.id)) {
    return <FaceForbidden face={face} floor={floor} />;
  }

  // The first route is the landing surface; deeper routes would match the
  // active path (kept simple for the shell core — see navigation adapter).
  const route = face.routes[0];
  if (!route) return <UnknownFaceComponent id={`${face.id}:no-routes`} />;
  const Component = resolveFaceComponent(route.component);
  if (!Component) return <UnknownFaceComponent id={route.component} />;
  return <Component manifest={face} />;
}

/** The shell frame. */
export function Shell({ faceIds, ambient, extras }: ShellProps) {
  const registry = useShellStore((s) => s.registry);
  const active = useShellStore((s) => s.active);
  const activate = useShellStore((s) => s.activate);

  const theme = resolveShellTheme({ userTheme: useShellStore.getState().userTheme, userPickedTheme: useShellStore.getState().userPickedTheme, active, registry });

  const faces = useMemo(() => {
    const ids = faceIds ?? registry.order;
    return ids.map((id) => registry.byId[id]).filter(Boolean) as FaceManifest[];
  }, [faceIds, registry]);

  const activeFace = registry.byId[active];

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="shell" data-theme="family">
      <a href="#main-content" className="shell-skip">Skip to main content</a>

      {/* Ambient + notifications + spoon dial — the heavy-hitter chrome. */}
      <ShellChrome />

      {/* Optional extra ambient override (rare; the shell owns the mount). */}
      {ambient && <div className="shell-ambient-extra" aria-hidden="true">{ambient}</div>}

      <header className="shell-head" role="banner">
        <div className="shell-head__brand">
          {activeFace && (
            <span className="shell-head__wordmark" dangerouslySetInnerHTML={{ __html: activeFace.wordmark }} />
          )}
        </div>
        <div className="shell-head__center">
          <FaceSwitcher
            items={faces.map((f) => ({ id: f.id, name: f.name, tier: f.tier }))}
            active={active}
            onSelect={activate}
          />
        </div>
        <div className="shell-head__trailing">
          <ShellSpoonDial />
          <ThemeCharmButton />
        </div>
      </header>

      <div className="shell-body">
        {activeFace && (
          <nav className="shell-nav" aria-label="Face navigation">
            {activeFace.nav.map((item) => (
              <a
                key={item.path}
                href={`#/${activeFace.id}${item.path}`}
                className="shell-nav__item"
                data-agent-kind="nav"
                data-agent-action={`shell.nav.${item.path}`}
              >
                {item.emoji && <span className="shell-nav__icon" aria-hidden="true">{item.emoji}</span>}
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        )}

        <main className="shell-main" id="main-content" data-mcp-tool={`p31:${active || 'shell'}`}>
          {activeFace ? <FaceRoute face={activeFace} /> : <UnknownFaceComponent id="shell:no-active-face" />}
        </main>
      </div>

      <footer className="shell-foot" role="contentinfo">
        <span>P31 · one shell, many faces</span>
        {extras}
      </footer>

      {/* ⌘K command palette — face + shell-action navigation. */}
      <ShellCommandPalette />
    </div>
  );
}