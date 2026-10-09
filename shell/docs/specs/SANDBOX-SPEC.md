# Sandbox Surface — Design & Build Specification

**Crew:** Sandbox Artisan  
**Date:** 2026-08-09  
**Status:** Live (feature pack deployed)  
**Owner:** `src/pages/SandboxPage.tsx` → `src/features/sandbox/*`

---

## Executive Summary

The **Sandbox** is a "vibe coding" playground — a chat + live artifact pair rivaling
ChatGPT Canvas / Claude / v0 / Gemini. A user describes a UI component, an agent
generates HTML, and the result is rendered **live** in a sandboxed iframe while a
panel of professional tools surrounds it:

- **Preview** with responsive device widths (mobile / tablet / desktop)
- **Zero-dependency code editor** with syntax highlight, undo/redo, versioning
- **Diff** viewer across snapshots
- **Element inspector** (DOM tree → highlight → click-to-edit)
- **Live console** capture from the running preview
- **Error linting** (parsererror overlay)
- **Export** single-file HTML or multi-file ZIP (custom zero-dep writer)
- **Deploy** to a live URL via remote worker

The surface is glass-over-starfield: the pane chrome and preview iframe are
transparent so the app's fixed starfield layer shows through with a `blur(14px)`
backdrop.

---

## 1. Architecture Overview

### 1.1 Component Tree

```
SandboxPage (pages/SandboxPage.tsx)
├── PageHeader (title "Sandbox", ☰ sidebar toggle, 🛠️ emoji, controls)
│   └── controls: [Hide/Show artifact] [↗ Pop out]
├── .surface-split--resizable (CSS grid: chat | handle | artifact)
│   ├── [chat column]
│   │   └── SandboxChat
│   │       ├── ChatSidebar (threads)      — collapsible via ☰
│   │       ├── .chat-pane
│   │       │   ├── .chat-empty-prompt | .chat-messages
│   │       │   │   └── ChatMessage (StreamingText + ToolChip)
│   │       │   └── .chat-composer
│   │       │       ├── .suggestion-chip (click-to-edit, optional)
│   │       │       └── .chat-composer-pill
│   │       │           ├── AgentSelector (.composer-agent-selector)
│   │       │           ├── textarea.chat-composer-input
│   │       │           └── .composer-actions (Send | Stop)
│   │       └── CognitiveShieldSuggestion (gate overlay)
│   ├── .surface-split-handle (drag / double-click)
│   └── [artifact column]
│       └── ArtifactPane
│           ├── .glass-card-title (title + ↗ Live)
│           ├── .artifact-tabs (Preview | Code | Diff | Inspect)
│           ├── .artifact-body
│           │   ├── preview: .artifact-toolbar + .artifact-preview-wrapper
│           │   │            (iframe, loading overlay, error overlay) + ConsolePanel
│           │   ├── code:    .artifact-toolbar (Undo/Redo) + .artifact-body-code
│           │   ├── diff:    .artifact-body-diff
│           │   └── inspect: ElementInspector
│           └── ArtifactFooter (monitor strip, version slider, actions)
```

### 1.2 State Stores

| Store | Module | Purpose |
|-------|--------|---------|
| `useSandboxStore` (Zustand) | `features/sandbox/sandboxStore.ts` | Threads, messages, artifacts, streaming, split, agent, sidebar |
| `useShellStore` | `store/useShellStore.ts` | `setSandboxOpen` — floating-window pop-out |
| `useAppStore` | `store/useAppStore.ts` | `did` (user id), `showToast`, spoons (via hooks) |
| `useDualEconomyStore` | `features/economy` | Spoon budget + karma for the cognitive gate |

### 1.3 Data Flow — Generate

```
user types → handleSend
  → evaluateSend (cognitiveGate: spoons/karma, shield rewrite)
  → sendMessage(text)
      → addMessage('user', text), setStreaming(''), setGenerating(true)
      → REMOTE: POST vibe-generate…/generate { prompt, vibe, age }
          ├─ ok+html  → addMessage('assistant', …) + onArtifactGenerated(title, html)
          ├─ ok+url   → addMessage('assistant', "Deployed to url")
          └─ fail     → LOCAL fallback
              → generateAssistantResponse (localLlm streaming simulation)
              → onArtifactGenerated(title, html)
      → onArtifactGenerated → SandboxPage.handleArtifactGenerated → addArtifact(title, code, code)
      → activeArtifactId set → ArtifactPane mounts, artifactOpen true
```

### 1.4 Data Flow — Edit Loop

```
textarea.onChange → setCode (pushes history) → localCode
  → 700ms debounce effect
      → updateArtifactCode (store)
      → snapshotArtifactVersion (cap 10)
      → lint wrapFragment via DOMParser (parsererror → overlay)
      → POST vibe-sandbox…/execute → setArtifactMonitor {score, duplication_pct, valid}
```

---

## 2. Layout & Split Pane

### 2.1 Container

- `.sandbox-page` — `position:absolute; inset:0; flex column; overflow:hidden;` **no background** (starfield shows through).
- `.page-fill` — definite-height flex chain, `padding: 0 sm sm`.

### 2.2 Resizable Split

`.surface-split--resizable` is a CSS grid:

```css
grid-template-columns: minmax(320px, var(--split-a, 1fr)) 4px minmax(360px, var(--split-b, 1fr));
```

- **Closed** (`[data-artifact="closed"]`): `grid-template-columns: 1fr 0 0` (chat full width).
- **Drag handle** (`pointerdown` → `pointermove`): computes `pct` from container rect, clamps **30–70%**, writes `--split-a/--split-b` as `fr`, persists.
- **Double-click** handle toggles the artifact panel open/closed.
- **Auto-open**: `useEffect` sets `artifactOpen = !!activeArtifactId`.

### 2.3 Persistence — Split State

`localStorage["p31-sandbox-split"] = { "open": boolean, "ratio": number }`.

- Read once via `persistedRef` conditional-init pattern (avoids re-read on re-render):
  ```ts
  const persistedRef = useRef<{open:boolean;ratio:number}|null>(null);
  if (!persistedRef.current) { /* parse localStorage with try/catch + type guard */ }
  ```
- `persistState(open, ratio?)` writes and mutates `persisted.ratio`.
- Applied on mount by writing the CSS vars onto the grid element.

### 2.4 Glass Pane

- The artifact container div in `SandboxPage` is **inline-styled transparent** (`background: 'transparent'`, 1px glass border when open).
- `.artifact-pane` — `background: var(--p31-glass-bg); backdrop-filter: var(--p31-glass-blur)` so the fixed starfield (`z-index: 0`, `pointer-events: none`) is blurred through the pane.
- **Preview iframe body is transparent** — `wrapFragment` injects `html,body{background:transparent}`; the dark canvas is provided by the generated component's own CSS. This is what makes the glass actually visible (previously a forced dark body hid the starfield).

---

## 3. Threads & Sidebar

`ChatSidebar` — `.chat-sidebar` (280px, glass, `backdrop-filter`).

| Element | Behavior |
|---------|----------|
| Header | "Threads" + `+ New` button |
| Thread item | Active state with accent `::before` bar; Enter to activate; hover reveals ✕ delete |
| Delete | `e.stopPropagation()` then `deleteThread(id)` — also purges `messages`/`artifacts` for the thread |
| Empty | "No threads yet." centered |
| Toggle | ☰ in header calls `toggleSidebar`; pane renders `ChatSidebar` only when not collapsed |

**Auto-create:** `SandboxChat` ensures `activeThreadId` on mount (`if (!activeThreadId) createThread()`).

---

## 4. Chat & Messages

`ChatMessage` renders `.chat-msg--user` / `.chat-msg--assistant` bubbles:

- Streaming text via `StreamingText` (live token chunk), else `pre-wrap` span.
- Timestamp footer: `You · hh:mm` / `Assistant · hh:mm`.
- Tool calls attached to a message render as collapsible `ToolChip` (status emoji, args preview, duration, expandable result/error body).
- Streamed tool events injected into the last assistant message via `subscribeToolCalls`.
- Auto-scroll on messages/streaming change via `messagesEndRef.scrollIntoView`.

---

## 5. Composer (Unified Pill)

### 5.1 Structure

```
.chat-composer (flex column, align-items:center, gap sm, max-width 720px, margin 0 auto)
├── .suggestion-chip (optional — only when a preview/inspector element is selected)
└── .chat-composer-pill
    ├── AgentSelector (.composer-agent-selector)
    ├── textarea.chat-composer-input
    └── .composer-actions (Send | Stop)
```

- **Width governance:** `.chat-composer` caps at `var(--p31-chat-max-width)` (720px) and centers; the pill is `width:100%` of that. This prevents the pill from stretching edge-to-edge.
- **Gapping rule:** single `gap: var(--p31-space-sm)` (16px) between chip and pill; the chip no longer carries its own `margin-bottom` (avoids double spacing). Chip + pill stay **centered** via `align-items: center` (chip is content-width, not a full-width bar).
- Pill: `overflow: visible` so the agent popover can escape; `:focus-within` → accent border.

### 5.2 Agent Selector

Four agents (`AgentId = 'mechanic' | 'narrator' | 'firmware' | 'architect'`):

| id | Name | Description |
|----|------|-------------|
| mechanic | Mechanic | Sonnet — builds things |
| narrator | Narrator | Godmother — tells stories |
| firmware | Firmware | Real-time systems |
| architect | Architect | System design |

- Trigger pill blends into composer (transparent until hover).
- Popover opens **above** (`bottom: 100% + 4px`), closes on outside `mousedown`.
- Accepts `className` prop; composer passes `composer-agent-selector` to strip the bordered look.

### 5.3 Textarea

- `flex:1; min-width:0; width:100%; min-height:48px; max-height:240px`.
- Auto-resize via `useLayoutEffect`: reset to `auto`, clamp `scrollHeight` to 240, restore `selectionStart/End`.
- Enter sends; Shift+Enter = newline.

### 5.4 Suggestion Chip (click-to-edit)

Appears when an element is selected (preview click **or** inspector click):

- Preview click → iframe posts `{type:'element-click'}` → chip `{selector, html}`.
- Inspector click → `CustomEvent('p31:element-click')` → chip `{selector, html:''}`.
- Clicking the chip fires `sendMessage('Update the element matching "<selector>" to be more polished.')`.
- ✕ dismisses. Escape clears it (and stops generation if streaming).

### 5.5 Keyboard Shortcuts

| Keys | Scope | Action |
|------|-------|--------|
| `Enter` | composer focused | Send |
| `Shift+Enter` | composer focused | Newline |
| `Ctrl/Cmd+Enter` | global | Send (disabled while generating) |
| `Escape` | global | Stop generating (if streaming) else clear suggestion chip |
| `Ctrl/Cmd+Z` / `Ctrl+Shift+Z` / `Ctrl/Cmd+Y` | code editor focused | Undo / Redo (history) |
| `Ctrl/Cmd+S` | global | Snapshot version |

---

## 6. Generation Pipeline

### 6.1 Cognitive Gate (`lib/cognitiveGate.ts`)

`evaluateSend({text, userId, zoneId:'commons', spoonBalance, karma})`:

- **Denied** (`!gate.allowed`) → toast with the denial message ("Stand Down active. Rest first.").
- **Shielded** (`gate.shouldShield && gate.shield?.rewritten`) → show `CognitiveShieldSuggestion`; Accept → send rewritten; Keep Original → send original; Close → dismiss.

### 6.2 Remote Worker — `vibe-generate`

| Endpoint | Method | Body | Success shape |
|----------|--------|------|---------------|
| `/generate` | POST | `{prompt, vibe:'warm', age:'family'}` | `{html}` or `{url}` |
| `/deploy` | POST | `{html, name:'sandbox-<ts>'}` | `{url}` |

Remote path short-circuits (`setStreaming(null)`); local fallback runs `localLlm` with simulated streaming chunks appended to `streamingText`, producing a single artifact on done.

### 6.3 Local Prompt Contract

System prompt requires: **only** valid HTML, embedded `<style>` (no external files), dark scheme (`background #0f1217, text #d0d0d8, accent oklch(65% 0.14 45)`), system-ui font, <200 lines, direct generation (no fences/explanations). Code fences stripped defensively.

### 6.4 Monitor Worker — `vibe-sandbox`

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/execute` | POST | `{html}` | `{score, duplication_pct, valid}` |

Written to `artifact.monitor`; surfaced in `ArtifactFooter` strip (Score / Dup / Valid, valid color via status tokens).

---

## 7. Artifact Pane

### 7.1 Tabs

`Tab = 'preview' | 'code' | 'diff' | 'inspect'`, rendered as `.artifact-tabs` with equal-width `.artifact-tab` buttons; active tab gets accent underline.

### 7.2 Preview Tab

```
.artifact-preview-tab (flex column, height:100%)
├── .artifact-toolbar
│   ├── device segmented: □ desktop | ▬ tablet | ▯ mobile   (widths 0 / 768 / 375 px)
│   └── ☷ Console toggle (.toolbar-seg--active when open)
├── .artifact-preview-wrapper (relative; maxWidth + margin auto when device set)
│   ├── iframe.artifact-body-iframe (srcDoc, sandbox="allow-scripts allow-modals")
│   ├── .p31-loading-overlay (on debounce)
│   └── .p31-error-overlay (parsererror lint)
└── ConsolePanel (180px, when open)
```

### 7.3 Code Tab

- Toolbar: `↩ Undo` / `↪ Redo` (disabled per history depth) + shortcut hints.
- `.artifact-body-code` — a zero-dependency editor pair:
  - `.code-highlight-layer` `<pre>` with `dangerouslySetInnerHTML` from `highlightHtml(localCode)` — **pointer-events:none**, z-index 1.
  - `.code-input-layer` `<textarea>` — **transparent text, visible caret**, z-index 2, `spellCheck=false`.
- `highlightHtml`: escapes `& < >`, then wraps tags/attrs/strings in `syn-tag` / `syn-attr` / `syn-str` spans colored by accent / accent-gold / accent-green.
- **History** (undo/redo): `historyRef = {past[], present, future[]}`, **max 50** past entries; `setCode` pushes current to past and clears future; `undo`/`redo` swap present. History is a ref (not state) — a `historyTick` state counter forces re-render so `canUndo/canRedo` button states update. History resets when the active artifact changes.

### 7.4 Diff Tab

- `computeDiff(prevVersion.code, activeArtifact.code)` — line-wise naive diff: `added` (status-online), `removed` (status-error), `same`.
- Empty states: "Select a previous version to compare." / "No differences."
- Version selection is the footer slider (`activeVersion`).

### 7.5 Inspect Tab

`ElementInspector` — `DOMParser` parse of `activeArtifact.code`, builds a tree of `{tag, id, classes, children}` from `document.body` (fallback `documentElement`).

- Header shows node count + hint.
- Recursive `NodeRow` with chevron collapse/expand; leaves show no toggle.
- Click a tag → `onSelect(selector)` → `handleInspectorSelect`:
  1. `setLastInspected(selector)` (re-applied on return to Preview tab),
  2. dispatch `CustomEvent('p31:element-click', {detail:{selector}})` → chat suggestion chip,
  3. `postMessage({type:'highlight-element', selector})` to the iframe (outline + `data-p31-highlight`).
- Tag/id/class colors: accent / accent-gold / accent-green.

### 7.6 Footer (`ArtifactFooter`)

- **Monitor strip**: `Score: <score> · Dup: <pct>% · ✓ Valid / ✗ Invalid` (or "No monitor data").
- **Version slider**: `v{active+1} / {total}`, range `0..versions.length-1`, accent thumb.
- **Actions**: Deploy | Copy | Download | Export ZIP | ↗ Pop out.

### 7.7 Pop-out

`onPopOut` → `(window).__p31_shellStore.setState({sandboxOpen:true})` → floating window (verified by suite: `[role="dialog"]`, `aria-modal="true"`, Esc closes, re-open persists).

---

## 8. Preview Iframe — Sandbox & Messaging

### 8.1 srcDoc Wrapper (`wrapFragment`)

If the code already contains `<html|<!DOCTYPE|<body` it is used **as-is**; otherwise it is wrapped:

```html
<!DOCTYPE html><html><head>
  <meta charset="utf-8">
  <style> html,body{margin:0;padding:0;background:transparent;color:<text>;font-family:system-ui,…} </style>
  <script> … injected bridge … </script>
</head><body><user html></body></html>
```

Injected bridge (all plain ES5, no `var()` leaks into the iframe):

1. **Console hook** — wraps `console.log/warn/error` (and `window.onerror`) → posts `{type:'console', payload:{type, args:[]}}`; args stringified (`Error` → message, objects → `JSON.stringify` with try/catch).
2. **Click bridge** — `click` on `[data-component], button, input, a, [role="button"]` (skips BODY/HTML) → `{type:'element-click', selector, html:outerHTML}`.
3. **Highlight listener** — on `{type:'highlight-element', selector}` → clears previous `[data-p31-highlight]`, outlines target `oklch(62% 0.22 25)`.

### 8.2 Message Protocol (postMessage)

| Direction | type | payload | Consumer |
|-----------|------|---------|----------|
| iframe → parent | `element-click` | `{selector, html}` | SandboxChat chip |
| iframe → parent | `console` | `{type:'log'|'warn'|'error', args:string[]}` | ConsolePanel |
| parent → iframe | `highlight-element` | `{selector}` | iframe highlight listener |

**Origin guard:** `srcDoc` iframes are null-origin, so parent posts with `'*'`; the parent listener resolves the target origin as `iframe.src?.startsWith('http') ? window.location.origin : '*'` and drops mismatches. `sandbox="allow-scripts allow-modals"` (no `allow-same-origin` → true null origin).

### 8.3 ConsolePanel

- Listens for `type==='console'`, normalizes payload, keeps **last 100 entries**, auto-scrolls.
- Rows colored by level; `Console •` indicator when an error exists; Clear button.

---

## 9. Export & Deploy

### 9.1 Download (single file)

`Blob([wrapFragment(code)], {type:'text/html'})` → `<slug>.html`.

### 9.2 Export ZIP (zero-dependency)

`src/lib/zip.ts` — a hand-rolled ZIP writer, **no external deps** (CodeMirror/jszip explicitly rejected):

- **STORE method** (no compression) + **CRC-32** (table-based).
- Local file header (30B) + file data, central directory (46B/entry), EOCD (22B).
- UTF-8 flag `0x0800`, DOS timestamp.
- Bundle: `index.html` (wrapped fragment) + `README.md`. Download as `<slug>.zip`.

### 9.3 Deploy

`POST vibe-generate…/deploy {html, name}` → `setLastDeployUrl(url)` → "↗ Live" link in pane header.

---

## 10. Design System Integration

### 10.1 Tokens Used (see `:root` in `index.css`)

- **Spacing (4px base):** micro 4 / tiny 8 / xs 12 / sm 16 / md 24 / lg 36 / xl 48 / 2xl 64.
- **Glass:** `--p31-glass-bg` (18% white), `--p31-glass-bg-strong` (22%), `--p31-glass-border` (16%), `--p31-glass-blur` (blur 14px).
- **Radius:** sm 2 / md 4 / lg 8 / xl 12 / full.
- **Duration:** instant 86ms / fast 172ms / base 431ms / heartbeat 863ms.
- **Scale:** xs 10 / sm 13 / md 16 / lg 20 / xl 25 px.
- **Status:** `--p31-status-{online,offline,warning,error,info}`.
- **Z-index:** `--p31-z-starfield: 0`, `--p31-z-dropdown: 100`, overlays above.

### 10.2 Hard Rules

1. **Zero hardcoded hex** in production code. Gate:
   `grep -Er "#[0-9a-f]{6}" src --include="*.tsx" --include="*.css" | grep -v comment`
   → must return zero. Known pre-existing exceptions: Canvas/Three.js scene colors, the LLM system-prompt string in `SandboxChat`, and the Pop-out button's `color:'#000000'`.
2. **All colors via `var(--p31-*)` or `oklch()`** (iframes use literal `oklch()` strings since the iframe cannot see parent CSS vars).
3. **Gapping discipline:** spacing comes from container `gap` or tokenized padding — never stacked margins (chip/pill gap is a single `sm`).
4. **Zero new npm dependencies** (the code editor and ZIP writer are self-contained).

---

## 11. Accessibility

- `<button>` elements throughout (native keyboard + focus).
- Split handle is a `role="separator"`, `aria-orientation="vertical"`, `tabIndex=0`, `touch-action:none`.
- Agent popover options are keyboard-activatable; outside-click closes.
- ToolChip header is a `role="button"` with Enter/Space toggle.
- Floating window (`sandbox:open`) is `role="dialog"` with `aria-modal="true"`; Esc closes (verify-enforced).
- Code textarea has visible caret over the highlight layer; both layers share identical metrics.
- Console/error/inspector text uses mono scale-xs with status-token colors (contrast via oklch).

---

## 12. Persistence — Current vs Prepared

| Concern | Mechanism | Status |
|---------|-----------|--------|
| Split position + open state | `localStorage["p31-sandbox-split"]` | **Wired** |
| Threads / messages / artifacts | `artifactPersistence.ts` (IndexedDB `p31-sandbox`, stores: threads/messages/artifacts/settings) | **Prepared, NOT wired** — a future step |
| Deploy URL | `sandboxStore.lastDeployUrl` (memory) | Session only |

---

## 13. Build, Verify & Deploy Pipeline

```bash
./node_modules/.bin/tsc --noEmit                 # must exit 0
./node_modules/.bin/vite build                   # must succeed
git add -A && git commit -m "shell: …"           # conventional messages
./node_modules/.bin/wrangler deploy              # → https://p31-shell.trimtab-signal.workers.dev
NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs   # run twice pre-release
```

### 13.1 Verify Suite — Sandbox Gates (`scripts/verify-shell.cjs`)

- Pop out button visible on sandbox page.
- `.surface-split--resizable` chat pane rendered.
- `.chat-composer-input` present; `.agent-selector-trigger` present.
- `sandbox:open` MCP command opens floating window; dialog has `role="dialog"` + `aria-modal="true"`.
- Esc closes the floating window; floating window state persists across re-open.

### 13.2 Known Flakes (do not chase)

- Cold-start mount timing on `.drawer-toggle` / spoon-level clicks (a2ui glass-card gate).

---

## 14. Known Limitations & Roadmap

Status: ✅ completed · ⛔ blocked (needs a dep)

1. ✅ **IndexedDB persistence wired** — `useSandboxPersistence` hydrates at boot and reconciles the full snapshot on change (Phase 0/4).
2. ✅ **Diff upgraded** — Myers O(ND) diff in `src/lib/diff.ts`, 10 unit tests (Phase 2).
3. ✅ **Chip refactor prompt** — injects the element's current `html` into the prompt (Phase 3).
4. ✅ **Console capture for full documents** — bridge script now injects into full `<html>` artifacts (Phase 3).
5. ⛔ **ZIP is STORE-only** — valid and openable everywhere, but larger than deflate. Upgrade blocked by the zero-new-npm-dependency rule; revisit only if a dependency is ever permitted.
6. ✅ **Theme-token-aware generation** — live CSS tokens (`--p31-bg/text/accent`) passed to `/generate` and the local fallback prompt (Phase 3).
7. ✅ **Device emulation** — viewport meta (375/768) + synthetic touchstart/touchend bridge for mobile/tablet previews (Phase 3).
8. ✅ **Memory bounds documented** — history max 50 and version cap 10 are deliberate; hydration trims match the store caps (Phase 4).

---

## 15. File Reference

| File | Role |
|------|------|
| `src/pages/SandboxPage.tsx` | Page shell, split pane, persistence, pop-out |
| `src/features/sandbox/SandboxChat.tsx` | Chat pane, composer pill, shortcuts, generation, gate |
| `src/features/sandbox/sandboxStore.ts` | Zustand store + types |
| `src/features/sandbox/ArtifactPane.tsx` | Artifact tabs, preview/code/diff, history, lint, messaging |
| `src/features/sandbox/ArtifactFooter.tsx` | Monitor, versions, actions |
| `src/features/sandbox/ConsolePanel.tsx` | Live console capture |
| `src/features/sandbox/ElementInspector.tsx` | DOM tree inspector |
| `src/features/sandbox/AgentSelector.tsx` | Agent pill + popover |
| `src/features/sandbox/ChatMessage.tsx` | Message bubble + tool chips |
| `src/features/sandbox/ToolChip.tsx` | Tool call expandable chip |
| `src/features/sandbox/ChatSidebar.tsx` | Thread list |
| `src/features/sandbox/artifactPersistence.ts` | IndexedDB layer (unwired) |
| `src/lib/zip.ts` | Zero-dep ZIP writer (STORE + CRC32) |
| `src/index.css` | All `.artifact-*`, `.chat-*`, `.console-*`, `.inspector-*`, `.toolbar-*` styles |
