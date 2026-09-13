import type { ReactNode } from 'react'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const INLINE_RE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g

function inline(text: string, baseKey: number): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = baseKey
  let m: RegExpExecArray | null
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) {
      out.push(<span key={k++}>{escapeHtml(text.slice(last, m.index))}</span>)
    }
    const token = m[0]
    if (token.startsWith('`')) {
      out.push(
        <code key={k++} className="md-code">
          {escapeHtml(token.slice(1, -1))}
        </code>
      )
    } else if (token.startsWith('**')) {
      out.push(<strong key={k++}>{escapeHtml(token.slice(2, -2))}</strong>)
    } else if (token.startsWith('*')) {
      out.push(<em key={k++}>{escapeHtml(token.slice(1, -1))}</em>)
    } else {
      const link = token.match(/\[([^\]]+)\]\(([^)\s]+)\)/)
      if (link) {
        out.push(
          <a key={k++} href={link[2]} target="_blank" rel="noreferrer" className="md-link">
            {link[1]}
          </a>
        )
      } else {
        out.push(<span key={k++}>{escapeHtml(token)}</span>)
      }
    }
    last = INLINE_RE.lastIndex
  }
  if (last < text.length) {
    out.push(<span key={k++}>{escapeHtml(text.slice(last))}</span>)
  }
  return out
}

const BLOCK_RE = /^(#{1,6})\s/

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <>
      {blocks.map((raw, i) => {
        const block = raw.trim()
        if (!block) return null
        if (BLOCK_RE.test(block)) {
          const level = Number(block.match(BLOCK_RE)?.[1] ?? '') || 1
          const Tag = (`h${Math.min(level, 6)}` as 'h3') || 'h3'
          return (
            <Tag key={i} className="md-h">
              {inline(block.replace(BLOCK_RE, ''), i * 100)}
            </Tag>
          )
        }
        if (block.startsWith('```')) {
          const code = block.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '')
          return (
            <pre key={i} className="md-pre">
              <code>{escapeHtml(code)}</code>
            </pre>
          )
        }
        if (block.split('\n').every((l) => /^[-*]\s/.test(l))) {
          return (
            <ul key={i} className="md-ul">
              {block.split('\n').map((l, j) => (
                <li key={j} className="md-li">
                  {inline(l.replace(/^[-*]\s/, ''), i * 100 + j)}
                </li>
              ))}
            </ul>
          )
        }
        const lines = block.split('\n')
        return (
          <p key={i} className="md-p">
            {lines.map((line, j) => (
              <span key={j}>
                {inline(line, i * 100 + j * 10)}
                {j < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        )
      })}
    </>
  )
}
