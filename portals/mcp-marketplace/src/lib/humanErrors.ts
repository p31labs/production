/**
 * humanErrors.ts — locked wording mapping (plan §Wording mapping).
 *
 * The registry worker and the wire helpers may still speak protocol. Any
 * message that reaches a human is passed through here first: known backend
 * phrasings become the locked plain sentences, unknown text passes through
 * untouched.
 */
const RULES: Array<{ re: RegExp; text: string }> = [
  { re: /probe failed|did not answer/i, text: 'We couldn\u2019t reach that server. Check the address and try again.' },
  { re: /RFC 8707|audience binding/i, text: 'This sign-in doesn\u2019t work here. Try again.' },
  { re: /backend|backend unreachable|network\/CORS/i, text: 'The helper isn\u2019t connected right now.' },
  { re: /LOVE settled/i, text: 'Payment confirmed' },
  { re: /registry|HTTP \d/i, text: 'The catalog is not answering right now. Try again in a minute.' },
]

/** Translate a raw error message into a human sentence (locked mapping). */
export function humanError(msg: unknown): string {
  const text = typeof msg === 'string' ? msg : msg instanceof Error ? msg.message : String(msg ?? '')
  for (const rule of RULES) {
    if (rule.re.test(text)) return rule.text
  }
  return text
}