import type { PocketCardTab } from '../store/useShellStore';

export interface PocketCardSection {
  label: string;
  content: React.ReactNode;
}

export interface PocketCardPageData {
  title: string;
  sections: Record<PocketCardTab, PocketCardSection>;
}

export const POCKET_CARD_DATA: Record<string, PocketCardPageData> = {
  identity: {
    title: '🪪 Identity Wallet',
    sections: {
      info: {
        label: 'Info',
        content: (
          <>
            <div className="pocket-card__section">
              <h4>Sovereign Identity</h4>
              <p>Your shell owns a DID (Decentralized Identifier) backed by Ed25519 and ML-DSA-65 (post-quantum) keys. The KEL (Key Event Log) is an immutable, signed event chain proving every key rotation and credential issuance.</p>
            </div>
            <div className="pocket-card__section">
              <h4>Key Concepts</h4>
              <ul>
                <li><code>DID</code> — your universal identifier (did:key)</li>
                <li><code>Ed25519</code> — classical signing key</li>
                <li><code>ML-DSA-65</code> — post-quantum signing key</li>
                <li><code>KEL</code> — signed event log of all key events</li>
                <li><code>SBT</code> — soulbound token (non-transferable credential)</li>
                <li><code>SD-JWT</code> — selective-disclosure JWT credential</li>
              </ul>
            </div>
          </>
        ),
      },
      welcome: {
        label: 'Welcome',
        content: (
          <div className="pocket-card__section">
            <h4>Welcome to your Identity Wallet</h4>
            <p>This is your sovereign identity cockpit. Your keys never leave this device unless you explicitly export them.</p>
            <p><strong>Quick start:</strong></p>
            <ul>
              <li>Check the <strong>DID</strong> card to see your identifier</li>
              <li>Visit <strong>Keys</strong> to initialize PQC</li>
              <li>Use <strong>Export identity</strong> to back up your full keyring + KEL</li>
            </ul>
          </div>
        ),
      },
      walkthrough: {
        label: 'Walkthrough',
        content: (
          <div className="pocket-card__section">
            <h4>Core Actions</h4>
            <p><strong>1. Export your identity</strong> — downloads a JSON file with DID, Ed25519, ML-DSA-65 public keys, and full KEL chain. Store it somewhere safe.</p>
            <p><strong>2. Prove control</strong> — signs a fresh challenge with your DID key. Use this to prove ownership to external verifiers.</p>
            <p><strong>3. Rotate keys</strong> — regenerate your Ed25519 or ML-DSA-65 keypair. The old key remains in the KEL for audit.</p>
            <p><strong>4. Issue credentials</strong> — switch to the <strong>Credentials</strong> tab to issue SBTs and SD-JWTs.</p>
          </div>
        ),
      },
      troubleshooting: {
        label: 'Troubleshooting',
        content: (
          <div className="pocket-card__section">
            <h4>Common Issues</h4>
            <ul>
              <li><strong>PQC key stuck on "Generating"</strong> — tap <strong>Init PQC</strong> in the Keys card. If it times out, refresh the page.</li>
              <li><strong>KEL shows "No events yet"</strong> — your KEL is empty until you perform an action (export, prove control, or key rotation).</li>
              <li><strong>Trust LOW / score 0</strong> — build trust by completing bonding rituals and maintaining mesh attestations.</li>
              <li><strong>Import failed</strong> — ensure the JSON file contains <code>did</code>, <code>ed25519Pub</code>, and a <code>kel</code> array.</li>
              <li><strong>Prove control idle</strong> — you need at least one key pair (Ed25519 or ML-DSA-65) initialized.</li>
            </ul>
          </div>
        ),
      },
      dev: {
        label: 'Dev',
        content: (
          <div className="pocket-card__section">
            <h4>Live State</h4>
            <p>Hook: <code>useIdentityWallet()</code></p>
            <p>State keys: <code>did</code>, <code>edPub</code>, <code>mldsaPub</code>, <code>pqcReady</code>, <code>kelEvents</code>, <code>kelValid</code>, <code>trust</code>, <code>meshPeers</code>, <code>spoons</code></p>
            <h4>Libraries</h4>
            <p><code>src/lib/identity.ts</code> — DID/Ed25519</p>
            <p><code>src/lib/pqc.ts</code> — ML-DSA-65</p>
            <p><code>src/lib/keri.ts</code> — KEL store</p>
            <h4>Debug</h4>
            <p>Open DevTools → Console → <code>window.__p31_identity</code> for the raw hook state snapshot.</p>
          </div>
        ),
      },
    },
  },

  dashboard: {
    title: '📊 Mission Control',
    sections: {
      info: {
        label: 'Info',
        content: (
          <>
            <div className="pocket-card__section">
              <h4>System Vitals</h4>
              <p>The Dashboard is your family's command center. It aggregates telemetry from every surface into a single glanceable view.</p>
            </div>
            <div className="pocket-card__section">
              <h4>Cards</h4>
              <ul>
                <li><code>Spoons</code> — energy budget (0–5)</li>
                <li><code>Mesh</code> — peer connectivity count</li>
                <li><code>LOVE</code> — ledger balance</li>
                <li><code>DUNA</code> — autonomous agent count</li>
                <li><code>Zone</code> — BLE presence zones</li>
                <li><code>Budget</code> — daily ritual budget</li>
              </ul>
            </div>
          </>
        ),
      },
      welcome: {
        label: 'Welcome',
        content: (
          <div className="pocket-card__section">
            <h4>Mission Control</h4>
            <p>This page surfaces the most important signals from your family's digital ecosystem.</p>
            <p><strong>Care Score</strong> (top-right) is a weighted composite: Spoons 40%, LOVE 30%, Mesh 20%, Rituals 10%.</p>
            <p>The sparkline at the bottom of the Spoon card shows your 7-day trend.</p>
          </div>
        ),
      },
      walkthrough: {
        label: 'Walkthrough',
        content: (
          <div className="pocket-card__section">
            <h4>Daily Routine</h4>
            <p><strong>1. Check Spoons</strong> — your energy level. If low (0–2), the rest overlay will appear.</p>
            <p><strong>2. Assess Zone</strong> — the Zone card shows which BLE zone you're in (home/away/focus).</p>
            <p><strong>3. Review LOVE</strong> — see recent inflows from bonding rituals.</p>
            <p><strong>4. Mesh status</strong> — green = peers connected, gold = partial, red = offline.</p>
          </div>
        ),
      },
      troubleshooting: {
        label: 'Troubleshooting',
        content: (
          <div className="pocket-card__section">
            <h4>Common Issues</h4>
            <ul>
              <li><strong>Cards blank / no data</strong> — check mesh connectivity. If offline, cards show cached state.</li>
              <li><strong>Care Score stuck</strong> — spoons/LOVE/mesh data refreshes on mount. Pull down to refresh.</li>
              <li><strong>DUNA count 0/100</strong> — DUNA is initialized on first bonding ritual completion.</li>
              <li><strong>Zone scanner offline</strong> — ensure BLE permissions are granted in browser settings.</li>
            </ul>
          </div>
        ),
      },
      dev: {
        label: 'Dev',
        content: (
          <div className="pocket-card__section">
            <h4>Live State</h4>
            <p>Hook: <code>useAppStore()</code> → <code>spoons</code>, <code>loveBalance</code></p>
            <p>Hook: <code>useMeshPeers()</code> → peer count</p>
            <p>Hook: <code>useDunaStats()</code> → agent count</p>
            <p>Hook: <code>useZoneStore()</code> → scanner state</p>
            <h4>Data Sources</h4>
            <p><code>src/lib/spoonHistory.ts</code> — 7-day sparkline</p>
            <p><code>src/features/hardware/zoneStore.ts</code> — BLE zones</p>
          </div>
        ),
      },
    },
  },

  bonding: {
    title: '🧬 Meatspace Tetra',
    sections: {
      info: {
        label: 'Info',
        content: (
          <>
            <div className="pocket-card__section">
              <h4>K₄ Counter-Architecture</h4>
              <p>The bonding surface models your family mesh as a tetrahedron (K₄ complete graph): 4 atoms, 6 bonds. Symmetry and curvature metrics quantify trust.</p>
            </div>
            <div className="pocket-card__section">
              <h4>Atom Tiers</h4>
              <ul>
                <li><code>GHOST</code> — symmetry &lt;35%</li>
                <li><code>STRUT</code> — symmetry 35–60%</li>
                <li><code>COHERENT</code> — symmetry 60–80%</li>
                <li><code>RESONANT</code> — symmetry ≥80%</li>
              </ul>
            </div>
          </>
        ),
      },
      welcome: {
        label: 'Welcome',
        content: (
          <div className="pocket-card__section">
            <h4>Meatspace Tetra</h4>
            <p>This surface visualizes your physical-world bonding rituals as a live tetrahedron. Each atom is a family member or peer; each bond is an attestation.</p>
            <p>Complete rituals to earn LOVE and climb the trust tiers.</p>
          </div>
        ),
      },
      walkthrough: {
        label: 'Walkthrough',
        content: (
          <div className="pocket-card__section">
            <h4>First Ritual</h4>
            <p><strong>1. Discover peers</strong> — ensure mesh is online. Peers appear as ghost atoms.</p>
            <p><strong>2. Select a ritual</strong> — rituals are generated from your current bonds. Solo rituals (self-care) are always available.</p>
            <p><strong>3. Complete & attest</strong> — tap a ritual card to complete it. LOVE is minted immediately.</p>
            <p><strong>4. Watch symmetry rise</strong> — more bonds = higher symmetry = higher trust tier.</p>
          </div>
        ),
      },
      troubleshooting: {
        label: 'Troubleshooting',
        content: (
          <div className="pocket-card__section">
            <h4>Common Issues</h4>
            <ul>
              <li><strong>No peers visible</strong> — mesh may be offline. Check the Dashboard Mesh card.</li>
              <li><strong>Rituals not generating</strong> — you need at least 1 peer or a solo ritual trigger.</li>
              <li><strong>Symmetry stuck</strong> — symmetry is computed from the live bond graph. Add more bonds.</li>
              <li><strong>LOVE not minted</strong> — check that the ritual completed successfully (toast notification).</li>
            </ul>
          </div>
        ),
      },
      dev: {
        label: 'Dev',
        content: (
          <div className="pocket-card__section">
            <h4>Live State</h4>
            <p>Hook: <code>window.__p31_bonding</code> (verify hook)</p>
            <p>Keys: <code>meshPeers</code>, <code>quests</code>, <code>completed</code>, <code>loveDelta</code>, <code>tetrad.symmetry</code>, <code>tetrad.curvature</code></p>
            <h4>Libraries</h4>
            <p><code>src/lib/meatspace/tetrahedron.ts</code> — geometry</p>
            <p><code>src/lib/meatspace/game.ts</code> — atom/bond generation</p>
            <p><code>src/features/bonding/questEngine.ts</code> — ritual quests</p>
          </div>
        ),
      },
    },
  },

  game: {
    title: '🎮 Game Builder',
    sections: {
      info: {
        label: 'Info',
        content: (
          <div className="pocket-card__section">
            <h4>L.O.V.E. Game Engine</h4>
            <p>The Game Builder lets you create spatial worlds and mint LOVE tokens through gameplay events. Worlds are persistent; LOVE minted here flows back into the family ledger.</p>
          </div>
        ),
      },
      welcome: {
        label: 'Welcome',
        content: (
          <div className="pocket-card__section">
            <h4>Welcome to the Game Builder</h4>
            <p>Create a world, set the rules, and mint LOVE through in-game actions. Your DID is the minting authority.</p>
            <p><strong>Tip:</strong> Use the Session status panel to queue actions and sync with Roblox.</p>
          </div>
        ),
      },
      walkthrough: {
        label: 'Walkthrough',
        content: (
          <div className="pocket-card__section">
            <h4>Your First World</h4>
            <p><strong>1. Create</strong> — enter a world name and optional description.</p>
            <p><strong>2. Mint LOVE</strong> — specify amount + reason + optional session ID.</p>
            <p><strong>3. Queue actions</strong> — in Session status, set a session ID and queue actions like <code>block_placed</code> or <code>chat_message</code>.</p>
            <p><strong>4. Sync Roblox</strong> — tap <strong>Sync Roblox LOVE</strong> to import events from Roblox.</p>
          </div>
        ),
      },
      troubleshooting: {
        label: 'Troubleshooting',
        content: (
          <div className="pocket-card__section">
            <h4>Common Issues</h4>
            <ul>
              <li><strong>World not creating</strong> — name is required. Check toast for error details.</li>
              <li><strong>Mint failed</strong> — ensure DID is initialized (check Identity tab).</li>
              <li><strong>Roblox sync 0 events</strong> — Roblox bridge may be offline. Verify the bridge endpoint.</li>
              <li><strong>Session status blank</strong> — session IDs are optional; leave blank to query overall status.</li>
            </ul>
          </div>
        ),
      },
      dev: {
        label: 'Dev',
        content: (
          <div className="pocket-card__section">
            <h4>Live State</h4>
            <p>Hook: <code>window.__p31_game</code> (verify hook)</p>
            <p>Keys: <code>worlds</code>, <code>did</code>, <code>minted</code>, <code>pending</code>, <code>session</code></p>
            <h4>Libraries</h4>
            <p><code>src/lib/gameBuilder.ts</code> — worlds, mint, queue</p>
            <p><code>src/lib/robloxBridge.ts</code> — Roblox sync</p>
          </div>
        ),
      },
    },
  },

  research: {
    title: '📚 Research Library',
    sections: {
      info: {
        label: 'Info',
        content: (
          <div className="pocket-card__section">
            <h4>SIC-POVM & K₄ Architecture</h4>
            <p>The Research Library surfaces papers on the Symmetric Informationally Complete Positive Operator-Valued Measure (SIC-POVM) representation and the K₄ counter-architecture for distributed care protocols.</p>
          </div>
        ),
      },
      welcome: {
        label: 'Welcome',
        content: (
          <div className="pocket-card__section">
            <h4>Research Library</h4>
            <p>Browse the paper collection, visualize mathematical structures live, and explore the SIC-POVM starfield model.</p>
            <p>Use the carousel dots to switch between visualizations.</p>
          </div>
        ),
      },
      walkthrough: {
        label: 'Walkthrough',
        content: (
          <div className="pocket-card__section">
            <h4>Using the Library</h4>
            <p><strong>1. Scan papers</strong> — the list fetches from Zenodo. Filter by tag if needed.</p>
            <p><strong>2. Toggle math</strong> — enable KaTeX rendering to see equations inline.</p>
            <p><strong>3. Switch viz</strong> — use the carousel dots to change the live visualization.</p>
            <p><strong>4. Export</strong> — BibTeX export is available per paper.</p>
          </div>
        ),
      },
      troubleshooting: {
        label: 'Troubleshooting',
        content: (
          <div className="pocket-card__section">
            <h4>Common Issues</h4>
            <ul>
              <li><strong>No papers loading</strong> — Zenodo API may be rate-limited. Refresh or check network.</li>
              <li><strong>KaTeX errors</strong> — some equations require additional macros. Check console for details.</li>
              <li><strong>Viz blank</strong> — WebGL may be blocked. Ensure hardware acceleration is on.</li>
              <li><strong>Carousel unresponsive</strong> — tap a dot directly; keyboard nav may be faster.</li>
            </ul>
          </div>
        ),
      },
      dev: {
        label: 'Dev',
        content: (
          <div className="pocket-card__section">
            <h4>Live State</h4>
            <p>Papers: <code>window.__p31_papers</code> or store</p>
            <p>Viz index: <code>currentIdx</code> state in ResearchPage</p>
            <h4>Libraries</h4>
            <p><code>src/lib/zenodo.ts</code> — paper fetcher</p>
            <p><code>src/features/research/</code> — viz components</p>
          </div>
        ),
      },
    },
  },

  sandbox: {
    title: '🛠️ Sandbox',
    sections: {
      info: {
        label: 'Info',
        content: (
          <div className="pocket-card__section">
            <h4>Component Prompt Engine</h4>
            <p>The Sandbox is a vibe-coding environment: describe a UI component in natural language and the assistant generates it live. Artifacts are rendered in a split-pane preview.</p>
          </div>
        ),
      },
      welcome: {
        label: 'Welcome',
        content: (
          <div className="pocket-card__section">
            <h4>Welcome to the Sandbox</h4>
            <p>This is your creative workspace. Type a prompt, watch the assistant build a component, and export the code.</p>
            <p>Use the sidebar to browse artifacts and the floating window for pop-out previews.</p>
          </div>
        ),
      },
      walkthrough: {
        label: 'Walkthrough',
        content: (
          <div className="pocket-card__section">
            <h4>First Component</h4>
            <p><strong>1. Prompt</strong> — type a description (e.g., "a glass card with a sparkline").</p>
            <p><strong>2. Preview</strong> — the component renders in the right pane.</p>
            <p><strong>3. Refine</strong> — iterate with follow-up prompts.</p>
            <p><strong>4. Export</strong> — copy the generated TSX into your project.</p>
          </div>
        ),
      },
      troubleshooting: {
        label: 'Troubleshooting',
        content: (
          <div className="pocket-card__section">
            <h4>Common Issues</h4>
            <ul>
              <li><strong>Preview blank</strong> — check the artifact panel for render errors.</li>
              <li><strong>Stream timeout</strong> — the assistant may have hit a token limit. Try a shorter prompt.</li>
              <li><strong>Floating window missing</strong> — use the "Pop out" button in the artifact header.</li>
              <li><strong>Agent not responding</strong> — ensure MCP servers are registered (check drawer).</li>
            </ul>
          </div>
        ),
      },
      dev: {
        label: 'Dev',
        content: (
          <div className="pocket-card__section">
            <h4>Live State</h4>
            <p>Artifacts: <code>window.__p31_artifacts</code></p>
            <p>Agent: <code>window.__p31_assistantMode</code></p>
            <h4>Libraries</h4>
            <p><code>src/features/sandbox/</code> — artifact system</p>
            <p><code>src/hooks/useRegisterShellMCP.ts</code> — MCP registry</p>
          </div>
        ),
      },
    },
  },

  cockpit: {
    title: '🚀 Docking Dome',
    sections: {
      info: {
        label: 'Info',
        content: (
          <div className="pocket-card__section">
            <h4>Geodesic Dome Telemetry</h4>
            <p>The Cockpit renders a live 3D geodesic dome with per-node telemetry. The Kuramoto order parameter <code>r(t)</code> measures synchrony across all nodes.</p>
          </div>
        ),
      },
      welcome: {
        label: 'Welcome',
        content: (
          <div className="pocket-card__section">
            <h4>Welcome to the Cockpit</h4>
            <p>This is your ship's bridge. Drag to orbit, scroll to zoom, click ports for details.</p>
            <p>Use the effects toggles to customize the starfield, aurora, and quantum constellation.</p>
          </div>
        ),
      },
      walkthrough: {
        label: 'Walkthrough',
        content: (
          <div className="pocket-card__section">
            <h4>Dome Controls</h4>
            <p><strong>1. Orbit</strong> — click and drag on the dome to rotate.</p>
            <p><strong>2. Zoom</strong> — scroll wheel zooms in/out.</p>
            <p><strong>3. Nodes</strong> — click a port to highlight its telemetry readout.</p>
            <p><strong>4. Effects</strong> — toggle aurora, quantum constellation, comet trails from the Passport tab.</p>
          </div>
        ),
      },
      troubleshooting: {
        label: 'Troubleshooting',
        content: (
          <div className="pocket-card__section">
            <h4>Common Issues</h4>
            <ul>
              <li><strong>Dome blank</strong> — WebGL context lost. Try disabling other GPU-heavy tabs.</li>
              <li><strong>Frame drops</strong> — reduce star density or disable aurora/comet trails.</li>
              <li><strong>r(t) stuck</strong> — Kuramoto model requires active mesh peers for synchrony.</li>
              <li><strong>Nodes not clickable</strong> — ensure the dome canvas has focus (click it first).</li>
            </ul>
          </div>
        ),
      },
      dev: {
        label: 'Dev',
        content: (
          <div className="pocket-card__section">
            <h4>Live State</h4>
            <p>Hook: <code>window.__p31_effects</code></p>
            <p>Keys: <code>starDensity</code>, <code>starSpeed</code>, <code>aurora</code>, <code>quantum</code>, <code>domeAccent</code>, <code>cometTrails</code></p>
            <h4>Libraries</h4>
            <p><code>src/features/ship/DomeGeometry.tsx</code> — dome mesh</p>
            <p><code>src/features/ship/CosmosFX.tsx</code> — effects pipeline</p>
            <p><code>src/hooks/useKuramotoOrderParameter.ts</code> — synchrony</p>
          </div>
        ),
      },
    },
  },
};
