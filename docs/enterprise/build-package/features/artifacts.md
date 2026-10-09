<!-- P31-HEADER
id: p31_feature_artifacts_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Artifacts

## The invariant

A substantial generated block — an HTML document, a large standalone SVG, or a
long code fence — promotes out of the transcript into a versioned artifact; the
same kind-plus-title regenerated in a session is one artifact with N versions;
the preview executes in an iframe whose sandbox is `allow-scripts` alone (opaque
origin); and the viewer re-renders only when the artifact's content or version
changes, never on every streaming token.

## The boundary

This feature does **not** own:

- **The message stream** — `message.content` (Wave 2) carries the text; this
  feature detects fences inside it.
- **The tool protocol** — a tool result is not an artifact.
- **The streaming renderer** — `StreamingMarkdown` (Wave 3) renders prose and
  code fences. This feature promotes some fences out of it.
- **Persistence beyond the session** — artifacts live in the session registry
  and localStorage; a durable store is a later wave.

Four rules this feature owns outright:

1. **Detection is a pure function.** `detectArtifacts(text): Artifact[]` returns
   HTML documents, standalone SVGs ≥ 2k chars, and code fences ≥ 48 lines or 3k
   chars. Prose, terminal, markdown, mermaid fences, and small snippets never
   promote. The thresholds are pinned.
2. **The dedupe key is `kind + title`, not content hash.** The same kind and
   title regenerated in a session is one artifact with N versions. The content
   hash identifies a version; the kind+title identifies the artifact.
3. **The sandbox is `allow-scripts` alone.** `allow-same-origin` is a same-origin
   escape. The SVG path uses DOMPurify with the same profile as the inline embed.
4. **The viewer memoizes on `content` and `version`.** A viewer that re-renders
   on every streaming token re-renders the scroll container, which re-measures
   its rows — the flicker loop the sidebar shares.

## The implementation

| File | What it provides |
|---|---|
| `src/shell/chat/artifactDetect.ts` | the pure `detectArtifacts(text)` function |
| `src/shell/chat/artifactStore.ts` | the per-session registry, `kind + title` dedupe, version history |
| `src/shell/chat/ArtifactCard.tsx` | the transcript card: icon, title, kind, version badge |
| `src/shell/chat/ArtifactPane.tsx` | the right-rail viewer: version stepper, PREVIEW/SOURCE, copy, download |
| `src/shell/chat/ArtifactPreview.tsx` | the sandboxed iframe (`allow-scripts`) + SVG path |
| `src/faces/chat/ChatFace.tsx` | *(modified)* render the right panel as the artifact pane |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| detection thresholds | a 50-line code fence → artifact; a 10-line fence → not | every fence → artifact; none → artifact |
| title derivation | `<title>`, `<h1>`, filename comment, first declaration | no title → anonymous, dedupe fails |
| kind+title dedupe | same HTML regenerated → one artifact, two versions | content-hash-only → two artifacts |
| sandbox | `allow-scripts` alone; `allow-same-origin` absent | both → same-origin escape |
| memoization | streaming a token does not re-render the pane | no memo → per-token re-render |
| source view | a 3k-line artifact scrolls smoothly in SOURCE | source janks |

## The gate

```bash
node scripts/gate.mjs --feature artifacts
npx playwright test tests/e2e/artifacts.spec.ts
```

Structural assertions are a precondition. Behavioural assertions are the gate:
(a) stream an artifact token-by-token, assert the pane's render count does not
grow with the token count; (b) the sandbox is `allow-scripts` alone.

## The escalation

When this feature blocks a surface, the surface does not ship with an artifact
panel. An artifact panel that re-renders on every token is a jank generator; an
artifact panel with `allow-same-origin` is a security hole.