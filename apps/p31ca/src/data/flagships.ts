/**
 * P31 Flagship registry — single source of truth for the hero pages.
 * Every URL is verified live (2026-09-23). Do not add a capability or metric
 * without a live URL or a published package behind it.
 */

export interface Flagship {
  slug: string
  name: string
  tagline: string
  url: string
  status: 'live' | 'vision'
  accent: string
  icon: string
  headline: string
  lede: string
  capabilities: { title: string; desc: string }[]
  stack: string[]
  links: { label: string; href: string }[]
  artifact: 'chain' | 'token' | 'gallery' | 'modegate' | 'terminal' | 'registry' | 'dome' | 'mesh'
  artifactPrompt: string
  faq: { q: string; a: string }[]
  ctaLabel: string
}

export const FLAGSHIPS: Flagship[] = [
  {
    slug: 'loom',
    name: 'Loom',
    tagline: 'Agent governance that proves what the AI did',
    url: 'https://loom.p31ca.org',
    status: 'live',
    accent: 'cyan',
    icon: '⛓️',
    headline: 'Every agent action, hash-chained and human-decided.',
    lede: 'The Loom is the governance layer the 2026 standards demand — a hash-chained, append-only audit trail where Lumi proposes and a human decides. Post-quantum identity, independent verification, co-presence enforced at the gate.',
    capabilities: [
      { title: 'Hash-chained audit', desc: 'SHA-256 per RFC 8785, tamper-evident, independently verifiable via GET /api/loom/verify.' },
      { title: 'Co-presence enforcement', desc: 'Lumi proposes, the human decides — a scope gate refuses any autonomous action.' },
      { title: 'Post-quantum identity', desc: 'ML-DSA-65 capability tokens bound to a responsible principal (AIC-JWT).' },
      { title: 'Refusal sidecar', desc: 'Every refused action recorded with its reason, on a separate verifiable chain.' },
    ],
    stack: ['React 19', 'Durable Objects', 'D1', 'Cloudflare Access', 'ML-DSA-65'],
    links: [
      { label: 'Open Loom', href: 'https://loom.p31ca.org' },
      { label: 'Verify the chain', href: 'https://loom.p31ca.org/api/loom/verify' },
    ],
    artifact: 'chain',
    artifactPrompt: 'Tamper with block 4 and watch the chain break — then verify.',
    faq: [{q:'Is the chain really verifiable?',a:'Yes — GET /api/loom/verify recomputes it. Anyone can check it.'},{q:'What stops Lumi from acting alone?',a:'A scope gate refuses any action the human did not approve.'}],
    ctaLabel: 'Open the Loom',

  },
  {
    slug: 'lumi',
    name: 'Lumi',
    tagline: 'The agent that never acts without you',
    url: 'https://loom.p31ca.org',
    status: 'live',
    accent: 'violet',
    icon: '🔮',
    headline: 'A persistent, scoped, auditable agent identity.',
    lede: 'Lumi is the Loom\'s agent — a warm companion with a did:key identity, post-quantum capability tokens, and a scope declaration it cannot cross. Proposes, never decides.',
    capabilities: [
      { title: 'PQC capability tokens', desc: 'Composite Ed25519 + ML-DSA-65, 15-minute expiry, fail-closed verification.' },
      { title: 'Scope declaration', desc: 'Lumi may propose and review — never approve, reject, or act. Enforced at the gate.' },
      { title: 'Deterministic memory', desc: 'A memory fold derived from the family log, not a hidden model context.' },
      { title: 'Session caps', desc: 'Per-session proposal limits enforced in a Durable Object (PIP).' },
    ],
    stack: ['did:key', 'ML-DSA-65', 'AIC-JWT', 'Durable Objects'],
    links: [
      { label: 'Meet Lumi', href: 'https://loom.p31ca.org' },
      { label: 'Lumi identity source', href: 'https://github.com/p31labs/production' },
    ],
    artifact: 'token',
    artifactPrompt: 'Watch the token expire, then renew it.',
    faq: [{q:'Is Lumi a chatbot?',a:'No — Lumi is a scoped agent identity that can only propose, never decide.'},{q:'What is ML-DSA-65?',a:'A NIST post-quantum signature. The token is composite Ed25519 + ML-DSA-65.'}],
    ctaLabel: 'Meet Lumi',

  },
  {
    slug: 'governance',
    name: 'Governance',
    tagline: 'The visual vocabulary of the audit layer',
    url: 'https://design.p31ca.org',
    status: 'live',
    accent: 'gold',
    icon: '🛡️',
    headline: 'Governance components anyone can embed.',
    lede: '@p31ca/governance — a published package of chain timelines, verify buttons, refusal feeds, and agent identity cards. The proof made visible and consumable.',
    capabilities: [
      { title: 'ChainTimeline', desc: 'Scrollable hash-linked event cards; broken chains show the exact divergence.' },
      { title: 'VerifyButton', desc: 'One click → GET /api/loom/verify → "Chain intact across N events."' },
      { title: 'LumiIdentityCard', desc: 'DID, capability scope, token countdown, ML-DSA-65 status.' },
      { title: 'EnforcementGauge', desc: 'observe vs enforce state with a live would-refuse counter.' },
    ],
    stack: ['@p31ca/governance', '@p31ca/design-core', 'React', 'DTCG tokens'],
    links: [
      { label: 'Design portal', href: 'https://design.p31ca.org' },
      { label: 'npm', href: 'https://www.npmjs.com/package/@p31ca/governance' },
    ],
    artifact: 'gallery',
    artifactPrompt: 'Click verify and watch the chain confirm.',
    faq: [{q:'Can I use these components in my own app?',a:'Yes — @p31ca/governance is a published package.'},{q:'Is the library real?',a:'It ships live components, not screenshots — what you see above is the actual API.'}],
    ctaLabel: 'Open the component gallery',

  },
  {
    slug: 'qpj',
    name: 'Quantum Pickle Jar',
    tagline: 'The family gateway. One jar, every surface.',
    url: 'https://qpj.p31ca.org',
    status: 'live',
    accent: 'gold',
    icon: '🫙',
    headline: 'Docs, Sheets, Slides, chat, and music — one sovereign jar.',
    lede: 'QPJ (Lantern) is the unified family gateway: progressive-disclosure modes, a PIN-elevated workshop, Yjs-collaborative Docs/Sheets/Slides, and a spatial music maker. Built on PGlite + Yjs + PQC.',
    capabilities: [
      { title: 'Collaborative suite', desc: 'Docs, Sheets, Slides on Yjs CRDT with PQC capability-token relay sync.' },
      { title: 'Progressive disclosure', desc: 'Spark → maker → workshop modes, PIN-gated, per-person isolation.' },
      { title: 'Spatial music maker', desc: 'Street-song: a collaborative spatial instrument with iframe bridge.' },
      { title: 'Sovereign identity', desc: 'Ed25519 + ML-DSA-65 hybrid PQC identity per family member.' },
    ],
    stack: ['React 19', 'Yjs', 'PGlite', 'XState v5', 'ML-DSA-65'],
    links: [
      { label: 'Open the Jar', href: 'https://qpj.p31ca.org' },
      { label: 'Docs relay', href: 'https://p31-doc-relay.trimtab-signal.workers.dev' },
    ],
    artifact: 'modegate',
    artifactPrompt: 'Enter the caregiver PIN (try 1234) and watch the workshop unlock.',
    faq: [{q:'Why modes?',a:'Progressive disclosure is a security posture — a child\'s mode never reaches caregiver tools without a PIN.'},{q:'What is inside the workshop?',a:'Tokens, recipes, components, and a sandboxed AI studio.'}],
    ctaLabel: 'Open the Jar',

  },
  {
    slug: 'cli',
    name: 'CLI',
    tagline: 'The sovereign stack, from the terminal',
    url: 'https://cli.p31ca.org',
    status: 'live',
    accent: 'green',
    icon: '⌨️',
    headline: 'One command. The whole stack.',
    lede: '@p31ca/cli — the sovereign agent-native CLI. Chat, deploy, manage PHOS surfaces, and inspect the mesh from a spoon-aware terminal. 3.0.0 on npm.',
    capabilities: [
      { title: 'p31 chat', desc: 'Interactive LLM session with spoon-aware presentation.' },
      { title: 'p31 phos', desc: '26+ forge subcommands: adopt, deploy, dashboard, state, jitterbug.' },
      { title: 'p31 mcp', desc: 'List, call, and serve MCP tools — a sovereign tool surface.' },
      { title: 'p31 shell', desc: 'Status, spoons, sensory — the fleet from your terminal.' },
    ],
    stack: ['TypeScript', 'OpenCode SDK', 'MCP SDK', 'Ink TUI', 'Node ≥22'],
    links: [
      { label: 'Install', href: 'https://cli.p31ca.org/install' },
      { label: 'npm', href: 'https://www.npmjs.com/package/@p31ca/cli' },
    ],
    artifact: 'terminal',
    artifactPrompt: 'Pick a command and copy it.',
    faq: [{q:'Is it a real terminal?',a:'These are real CLI commands — p31 chat, phos deploy, mcp list, shell status.'},{q:'How do I install it?',a:'npm install -g @p31ca/cli or curl the install script.'}],
    ctaLabel: 'Install the CLI',

  },
  {
    slug: 'mcp',
    name: 'MCP Marketplace',
    tagline: 'Sovereign tools for any agent',
    url: 'https://mcp-registry.trimtab-signal.workers.dev',
    status: 'live',
    accent: 'cyan',
    icon: '🧩',
    headline: 'A marketplace where agents and tools transact.',
    lede: 'A central MCP registry and marketplace on Cloudflare Workers — listings, offers, escrow, and trust-gated trades, served to any MCP client. Plus a suite of published MCP servers.',
    capabilities: [
      { title: 'MCP registry', desc: 'Central discovery of registered MCP servers with live tool lists.' },
      { title: 'Marketplace', desc: 'Listings, offers, escrow, and SBT-minted trades via Durable Objects.' },
      { title: 'Justice tools', desc: '@p31ca/mcp-justice: evidence deposit, verify, escrow, ODR — 7 tools.' },
      { title: 'Design + crypto', desc: 'Token/component servers and a post-quantum crypto server.' },
    ],
    stack: ['Cloudflare Workers', 'Durable Objects', 'D1', 'MCP Streamable HTTP'],
    links: [
      { label: 'Registry', href: 'https://mcp-registry.trimtab-signal.workers.dev' },
      { label: 'Marketplace MCP', href: 'https://marketplace-mcp.trimtab-signal.workers.dev' },
    ],
    artifact: 'registry',
    artifactPrompt: 'This panel queries the live registry — what you see is deployed.',
    faq: [{q:'Is the registry real?',a:'It calls the live mcp-registry endpoint. If it shows servers, they are running.'},{q:'Can my agent use these?',a:'Yes — any MCP client can connect to the registered servers.'}],
    ctaLabel: 'Query the registry',

  },
  {
    slug: 'spaceship-earth',
    name: 'Spaceship Earth',
    tagline: 'The sovereign cognitive cockpit',
    url: 'https://spaceship-earth.pages.dev',
    status: 'vision',
    accent: 'violet',
    icon: '🌍',
    headline: 'A geodesic dome for the mind.',
    lede: 'An immersive 3D geodesic cockpit — 320 interactive face ports, a Dymaxion net, and sovereign state that respects your cognitive energy. A vision in active development.',
    capabilities: [
      { title: 'Geodesic dome', desc: '320 faces, 9,600 NeoPixel segments, a full Dymaxion net overlay.' },
      { title: 'Spoon-aware rendering', desc: 'Bloom, FPS, and star scale follow your cognitive energy.' },
      { title: 'Universal dataset layer', desc: 'Map external data onto the dome with legend and timeline scrubber.' },
      { title: 'Sovereign state', desc: 'Zustand + PGLite historical ledger, offline-first.' },
    ],
    stack: ['Three.js', 'React 19', 'PGLite', 'Yjs', 'WebGPU'],
    links: [
      { label: 'Launch the dome', href: 'https://spaceship-earth.pages.dev' },
    ],
    artifact: 'dome',
    artifactPrompt: "Adjust spoons and watch the dome's richness respond.",
    faq: [{q:'Is this the real cockpit?',a:'This is a faithful simplification of the WebGPU dome — same spoon-aware rule, reduced-motion safe.'},{q:'Why is it a vision?',a:'It is live but in active development — the flagship page is honest about that.'}],
    ctaLabel: 'Launch the dome',

  },
  {
    slug: 'meatspace',
    name: 'Meatspace',
    tagline: 'In-person rituals, family-first',
    url: 'https://meatspace.p31ca.org',
    status: 'live',
    accent: 'green',
    icon: '🤝',
    headline: 'Connection that happens in the same room.',
    lede: 'Meatspace is the portal for in-person family rituals — maps, together-time prompts, calendar, and a P2P presence mesh. No accounts, no surveillance, just presence.',
    capabilities: [
      { title: 'Ritual prompts', desc: 'Bonding Buddy suggests together-time activities for your family.' },
      { title: 'P2P presence mesh', desc: 'PeerJS HeartbeatMesh — no central server, DID-based identity.' },
      { title: 'Family calendar', desc: 'Local-first Yjs calendar with y-indexeddb persistence.' },
      { title: 'LOVE ledger', desc: 'Bonds and check-ins earn soulbound LOVE tokens.' },
    ],
    stack: ['React 19', 'PeerJS', 'Yjs', 'DID identity'],
    links: [
      { label: 'Open Meatspace', href: 'https://meatspace.p31ca.org' },
    ],
    artifact: 'mesh',
    artifactPrompt: 'Toggle members and watch the K₄ mesh re-form.',
    faq: [{q:'Is there a central server?',a:'No — it is a peer-to-peer presence mesh. Every node connects to every other.'},{q:'Is there an account?',a:'No — DID identity, presence only. No surveillance.'}],
    ctaLabel: 'Open Meatspace',

  },
]

export const FLAGSHIP_COUNT = FLAGSHIPS.length
export const FLAGSHIP_LIVE_COUNT = FLAGSHIPS.filter((f) => f.status === 'live').length