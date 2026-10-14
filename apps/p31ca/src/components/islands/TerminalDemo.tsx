import { useState } from 'react'

/**
 * TerminalDemo — the interactive CLI transducer.
 * Pick a command, see what it does, copy it. "Show the code" rule: real,
 * copy-pasteable, not a static image.
 */
const COMMANDS = [
  { cmd: 'p31 chat', desc: 'Interactive LLM session, spoon-aware', out: 'You → Lumi → you. 3 spoons today, calm mode.' },
  { cmd: 'p31 phos deploy', desc: 'Deploy a PHOS surface to Cloudflare', out: '✓ Built 12.4s · ✓ Uploaded 2.1MB · ✓ live phos.p31ca.org' },
  { cmd: 'p31 mcp list', desc: 'List your registered MCP tools', out: 'design-mcp (35) · crypto-mcp (12) · justice (7) · marketplace (10)' },
  { cmd: 'p31 shell status', desc: 'Fleet status from the terminal', out: '✓ gateway · ✓ phos · ✓ p31ca · ✓ relay — all operational' },
]

export default function TerminalDemo() {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMANDS[active].cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div className="td-rounded-2xl td-border td-overflow-hidden" style={{ borderColor: 'var(--p31-glass-border)', background: '#141413' }}>
      <div className="td-flex td-gap-1-5 td-px-4 td-py-2-5 td-border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="td-w-2-5 td-h-2-5 td-rounded-full" style={{ background: 'var(--p31-chain-broken, #c0392b)' }} />
        <span className="td-w-2-5 td-h-2-5 td-rounded-full" style={{ background: 'var(--p31-chain-pending, #d97757)' }} />
        <span className="td-w-2-5 td-h-2-5 td-rounded-full" style={{ background: 'var(--p31-chain-verified, #788c5d)' }} />
      </div>
      <div className="td-p-4 td-font-mono td-text-sm">
        {COMMANDS.map((c, i) => (
          <button
            key={c.cmd}
            onClick={() => setActive(i)}
            className="td-block td-w-full td-text-left td-px-2 td-py-1 td-rounded"
            style={{ background: i === active ? 'rgba(217,119,87,0.15)' : 'transparent', color: i === active ? '#d97757' : '#faf9f5' }}
          >
            $ {c.cmd}
          </button>
        ))}
        <div className="td-mt-4 td-px-2 td-text-xs" style={{ color: 'rgba(250,249,245,0.6)' }}>{COMMANDS[active].desc}</div>
        <div className="td-mt-2 td-px-2 td-py-2 td-text-xs td-rounded" style={{ background: 'rgba(120,140,93,0.1)', color: 'rgba(250,249,245,0.85)' }}>{COMMANDS[active].out}</div>
        <button onClick={copy} className="td-mt-4 td-text-xs td-px-3 td-py-1-5 td-rounded" style={{ background: '#d97757', color: '#141413' }}>
          {copied ? '✓ Copied' : 'Copy command'}
        </button>
      </div>
    </div>
  )
}