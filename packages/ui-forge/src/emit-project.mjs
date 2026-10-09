/**
 * emit-project.mjs — the tree → deployable artifact bridge (Workflow B's final stage).
 *
 * The tetrahedron produces a component tree (or a research report). This module
 * dispatches it to a *target emitter* — a pure function returning the full file
 * set for a deployable artifact:
 *
 *   (input, opts) → { files: Record<relativePath, content> }
 *
 * The dispatch is a DOMAIN REGISTRY, not a structural one: the artifact_type →
 * emitter relationships are deliberate, hand-declared, and should not be
 * generated. (RFC 001 Component Dictionary — a deterministic emitter registry;
 * "domain registries stay explicit, structural registries get generated.")
 *
 * Invariants (enforced by test/emit-project.test.mjs):
 *   - Deterministic: same input → byte-identical output. No timestamps, no random.
 *   - Pure: no filesystem writes, no network, no LLM. The caller writes files.
 *   - Total: an unknown artifact_type throws — never silently defaults.
 *   - The gate: each emitted project must `npm install && npm run build` clean.
 */
import { emitWebsite } from './emitters/website.mjs';
import { emitApp } from './emitters/app.mjs';
import { emitReport } from './emitters/report.mjs';

export { jsxProp, jsxNode, collectTypes, emitAppTsx } from './emitters/primitives.mjs';

/**
 * The emitter registry. Each entry is a pure function
 *   (input: { tree?, report? }, opts) => { files }
 * Frozen — the registry must not be mutated at runtime. A fourth target is a
 * deliberate addition, never a directory scan. `game` is deliberately absent:
 * it changes the mount point and needs a game-engine boot contract, so it
 * throws until a real game spec exists to test against.
 */
export const EMITTERS = Object.freeze({
  website: emitWebsite,
  app: emitApp,
  report: emitReport,
});

/** All supported artifact types, derived from the registry (single source of truth). */
export const ARTIFACT_TYPES = Object.freeze(Object.keys(EMITTERS));

/**
 * Emit a deployable artifact from a tree or report.
 *
 * @param {{ tree?: object, report?: string }} input
 * @param {{ artifactType?: 'website'|'app'|'report', name?: string, designCorePath?: string }} [opts]
 * @returns {{ artifactType: string, name: string, files: Record<string,string> }}
 * @throws {Error} when artifactType is unknown (never silently defaults)
 */
export function emitProject(input, { artifactType = 'website', name = 'p31-app', designCorePath = 'file:../../packages/design-core' } = {}) {
  const emitter = EMITTERS[artifactType];
  if (!emitter) {
    throw new Error(
      `emit-project: unknown artifact type "${artifactType}". ` +
      `Known types: ${ARTIFACT_TYPES.join(', ')}.`,
    );
  }
  const { files } = emitter(input, { name, designCorePath });
  return { artifactType, name, files };
}

export default emitProject;