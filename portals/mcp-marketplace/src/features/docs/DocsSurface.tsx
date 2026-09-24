/**
 * Docs — the enterprise guide: integration, verification & audit, moderation,
 * governance, and FAQ. Everything stated here maps to a live API endpoint.
 */

const STEPS = [
  { icon: '🧭', title: 'Discover', body: 'Browse the live catalog. Every server card reports real health, tool count, category, verification, and a "last probed" freshness timestamp — from the registry, not curated claims.' },
  { icon: '🧰', title: 'Inspect schemas', body: 'Open any server to see its tools grouped by risk (read vs write) with full JSON-Schema input definitions pulled from the live tools/list response.' },
  { icon: '🛠️', title: 'Play', body: 'Open a tool in the playground. The form is generated from its schema. Calls run through the registry proxy (CORS-safe) against the real endpoint and land in your session log with latency + result.' },
  { icon: '📤', title: 'Publish', body: 'Register your own Streamable-HTTP server. The registry runs a real initialize + tools/list probe before accepting it; entries appear unverified until a P31 review signs them live.' },
]

const CONFIG_EXAMPLES = [
  {
    label: 'opencode (opencode.jsonc)',
    code: `"mcp": {
  "p31-crypto": { "type": "remote", "url": "https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp" },
  "p31-justice-hub": { "type": "remote", "url": "https://p31-justice-hub.trimtab-signal.workers.dev/mcp" },
  "soulsafe": { "type": "local", "command": ["node", "cli/soulsafe-server.js"] }
}`,
  },
  {
    label: 'Claude Code (.mcp.json)',
    code: `{
  "mcpServers": {
    "bros": { "url": "https://bros.trimtab-signal.workers.dev/mcp" },
    "dads": { "url": "https://dads.trimtab-signal.workers.dev/mcp" }
  }
}`,
  },
  {
    label: 'Cursor (MCP settings)',
    code: `{
  "mcpServers": {
    "design-mcp": { "command": "node", "args": ["cli/design-mcp-server.js"] }
  }
}`,
  },
]

const FAQ = [
  { q: 'Is every "live" badge real?', a: 'Yes. Health comes from a live initialize + tools/list probe against the endpoint, with the advertised protocol version validated against the supported set. No mock states.' },
  { q: 'How does verification work?', a: 'Official entries carry verify metadata (ML-DSA-65 declared, checkedAt timestamp). Community entries approved by a P31 review are signed with an Ed25519 review record (signedBy, alg, signature) visible on the server card.' },
  { q: 'What is the audit log?', a: 'Every tool call through the registry proxy is appended to a SHA-256 hash chain (GET /audit). Entry hashes link to the previous entry and a separately stored head, so the chain is tamper-evident and re-verifiable.' },
  { q: 'Can anyone register a server?', a: 'Yes — POST /servers. The registry validates liveness (initialize + tools/list) before accepting; the entry is marked unverified and lands in the moderation queue (GET /servers/pending) until reviewed.' },
  { q: 'What happens to slow or broken servers?', a: 'Health is cached for 2 minutes and re-probed on demand. Down or degraded servers show the exact reason (e.g. unsupported protocol version 2026-07-28) and never crash the catalog.' },
  { q: 'How is the data protected?', a: 'Registration is rate-limited per IP. Admin surfaces (/logs, /errors, /servers/pending, /review) require the ADMIN_TOKEN. Browser errors report to the registry\'s self-hosted ingestion endpoint, keeping telemetry inside the P31 control plane.' },
]

export function DocsSurface() {
  return (
    <div className="home-container" style={{ maxWidth: 820 }}>
      <section className="home-hero">
        <h1 className="greeting-h1">How it works</h1>
        <p className="landing-sub">A governed MCP marketplace and playground. No invented metrics — every badge is a live registry probe, and every call is audited.</p>
      </section>

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', marginBottom: 'var(--p31-space-3)' }}>The lifecycle</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
          {STEPS.map((s) => (
            <div key={s.title} className="surface-card" style={{ padding: 'var(--p31-space-4)' }}>
              <div className="surface-card-header">
                <span className="surface-card-icon" aria-hidden="true">{s.icon}</span>
                <div className="surface-card-title">{s.title}</div>
              </div>
              <div className="surface-card-desc">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', marginBottom: 'var(--p31-space-3)' }}>Connect a catalog server to your agent</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
          {CONFIG_EXAMPLES.map((c) => (
            <div key={c.label} className="surface-panel">
              <div style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-sm)', marginBottom: 'var(--p31-space-2)' }}>{c.label}</div>
              <pre style={{ overflow: 'auto', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-md)', padding: 'var(--p31-space-3)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', color: 'var(--p31-text-secondary)' }}>{c.code}</pre>
            </div>
          ))}
          <div style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
            Local stdio servers (soulsafe, oasis, phos-forge) connect via <code style={{ fontFamily: 'var(--p31-font-mono)' }}>node cli/&lt;server&gt;.js</code>. Endpoints are listed on every server card.
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', marginBottom: 'var(--p31-space-3)' }}>Verification, audit & governance</h2>
        <div className="surface-panel">
          <ul style={{ color: 'var(--p31-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', paddingLeft: 'var(--p31-space-4)' }}>
            <li><strong style={{ color: 'var(--p31-text-primary)' }}>Health</strong> — initialize + tools/list probe with protocol-version validation. Down/degraded servers show their exact reason.</li>
            <li><strong style={{ color: 'var(--p31-text-primary)' }}>Status</strong> — <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>live</span> official entries vs <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>unverified</span> community registrations.</li>
            <li><strong style={{ color: 'var(--p31-text-primary)' }}>Verify + review</strong> — official entries carry ML-DSA-65 verify metadata; approved community entries carry an Ed25519 review signature (✓ reviewed badge).</li>
            <li><strong style={{ color: 'var(--p31-text-primary)' }}>Audit log</strong> — every proxied call is appended to a SHA-256 hash chain (GET /audit). Entry hashes chain to a separately stored head, making the log tamper-evident.</li>
            <li><strong style={{ color: 'var(--p31-text-primary)' }}>Risk</strong> — tools are classified read vs write from their names + the server's readOnlySafe flag. Write tools require confirmation before execution.</li>
            <li><strong style={{ color: 'var(--p31-text-primary)' }}>Moderation</strong> — community submissions queue to <code style={{ fontFamily: 'var(--p31-font-mono)' }}>/servers/pending</code> and are signed live on approval; rejects are retained in a rejected registry.</li>
          </ul>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', marginBottom: 'var(--p31-space-3)' }}>FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
          {FAQ.map((f) => (
            <div key={f.q} className="surface-card" style={{ padding: 'var(--p31-space-4)' }}>
              <div style={{ color: 'var(--p31-accent)', fontWeight: 600, marginBottom: 'var(--p31-space-1)' }}>{f.q}</div>
              <div className="surface-card-desc">{f.a}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}