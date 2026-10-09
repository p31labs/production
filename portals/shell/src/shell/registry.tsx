/**
 * shell/registry.ts — the face component registry.
 *
 * The shell resolves a face's declared `routes[].component` string to a
 * registered React component. Faces are declarative (manifests); the shell
 * owns the code that renders them. A face that declares a component id the
 * shell doesn't know renders a graceful fallback — never a crash.
 */
import type { ComponentType } from 'react';
import type { FaceManifest } from './face';

export interface FaceComponentRegistry {
  /** id → route-component renderer, registered by the shell host. */
  byId: Record<string, ComponentType<{ manifest: FaceManifest }>>;
}

/** The shell's component registry — populated by the host (the app). */
export const faceComponents: FaceComponentRegistry = { byId: {} };

/** Register a route component by id. Returns an unregister function. */
export function registerFaceComponent(id: string, comp: ComponentType<{ manifest: FaceManifest }>): () => void {
  faceComponents.byId[id] = comp;
  return () => { delete faceComponents.byId[id]; };
}

/** Resolve a component id → renderer, or null (fallback renders instead). */
export function resolveFaceComponent(id: string): ComponentType<{ manifest: FaceManifest }> | null {
  return faceComponents.byId[id] ?? null;
}

/** A graceful fallback for an unknown component id — shows what was asked. */
export function UnknownFaceComponent({ id }: { id: string }) {
  return (
    <div className="shell-fallback" role="status">
      <p className="shell-fallback__title">This surface is not wired yet.</p>
      <p className="shell-fallback__detail">
        <span>Requested component: </span>
        <code>{id}</code>
      </p>
    </div>
  );
}