# P31 Sovereign Shell — User Guide

## What is the Shell?

The P31 Sovereign Shell is a browser-based cockpit for managing your sovereign digital life. It combines:

- **Identity**: Post-quantum keys (Ed25519 + ML-DSA-65) with KERI key event logs
- **Spoons**: Neurodivergent energy budget (0–5) with crisis detection and rest mode
- **Mesh**: Peer-to-peer family network via libp2p WebRTC
- **LOVE**: A local gratitude ledger for tracking care contributions
- **Research**: Live, runnable math visualizations (SIC-POVM, K₄ graph, morphogenetic fields)
- **MCP**: 90+ shell commands exposed as MCP tools for AI agents

## Getting Started

### 1. Open the Shell

Navigate to `https://p31-shell.trimtab-signal.workers.dev` in any modern browser (Chrome, Firefox, Safari, Edge). The shell works offline after first load (PWA).

### 2. The Spoon Dial

In the topbar, you'll see a row of numbered buttons (1–5) and a pause icon. This is your **spoon dial** — your current energy budget.

- Tap a number to set your spoon level
- Tap the rest icon to enter sensory rest mode (dark overlay, frozen animations)
- The shell adapts: animations slow/stop at low spoons, mesh and notifications adjust

### 3. Bottom Navigation

Seven surface tabs:

| Tab | What It Does |
|-----|-------------|
| **Home** | Landing page with quick actions |
| **Dashboard** | Command center — spoons, mesh peers, LOVE balance, DUNA progress, Care Score |
| **Cockpit** | 3D tetrahedron dome with quantum constellation and glass telemetry panels |
| **Bonding** | Meatspace Tetra — K₄ self-care rituals that mint LOVE |
| **Research** | Split viewport with Zenodo papers (scroll left) and looping math demos (right) |
| **Profile** | Your DID, keys, KEL chain, credential wallet, identity export/import |
| **Sandbox** | HTML/CSS/JS playground with live preview and floating window persistence |

### 4. Command Palette

Press `Ctrl+K` (Windows/Linux) or `⌘K` (Mac) to open the command palette. Type commands like:
- `spoons 3` — set energy level
- `love balance` — check LOVE ledger
- `mesh transport` — switch to libp2p
- `assistant mode local` — use on-device LLM

### 5. The Assistant

Click the assistant panel (brain icon in the side) to chat with the AI. Switch between:
- **Auto**: Cloud LLM when online, local fallback
- **Local**: WebLLM running entirely on your device
- **Cloud**: Always use cloud inference

## Configuration

### Identity

In the **Profile** tab:
- View your DID, Ed25519 public key, ML-DSA-65 public key
- Export your identity (DID + keys + KEL) as JSON
- Import an identity from another device
- Rotate post-quantum keys (creates a KEL rotation event)
- Issue test credentials (SD-JWT)

### Sensory Passport

In the **Home** tab, click "Sensory passport" to customize:
- Warm stars (amber-tinted starfield)
- Dome accent (accent-colored edges)
- Comet trails (particle trails)
- Aurora (northern lights effect)
- Quantum constellation (K₄ overlay)
- Reading fonts: Standard vs Atkinson Hyperlegible
- Text scale: Standard vs Comfort
- Muted colors: reduce chroma for light sensitivity
- Calm mode: freeze all motion

### Rest Mode

Tap the rest icon (pause symbol) in the spoon dial to enter rest mode:
- Dark overlay with minimalist starfield
- All motion frozen
- Press Escape or click "Return to interface" to exit
- Spoons automatically set to 2 on exit

## Privacy & Security

- **All data is local**: Keys, KEL events, spoon history, and LOVE balances stay in your browser's IndexedDB
- **No accounts**: Your identity is a `did:key` — no email, no password
- **P2P mesh**: Peer connections use WebRTC-Direct — no central relay stores your data
- **Post-quantum**: ML-DSA-65 keys resist both classical and quantum attacks

## PWA Installation

The shell is a Progressive Web App. Install it for offline use:
1. Open in Chrome/Edge → Click the install icon in the address bar
2. Safari → Share → Add to Home Screen
3. Firefox → technically works but doesn't show install prompt

Once installed, it works without internet — spoon tracking, identity, and local LLM all run offline.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Mesh shows 0 peers | Open in a second browser tab or invite another family member |
| LOVE balance shows — | Wait for the ledger to respond (first load) or check offline mode |
| Spoon history empty | History populates after 1+ spoon changes |
| Research papers not loading | Zenodo API may be rate-limited; retry in a moment |
| PWA update not applying | Close all tabs, reopen, and click the update toast |
| Keys missing after reinstall | Import your identity JSON (you exported it, right?) |
