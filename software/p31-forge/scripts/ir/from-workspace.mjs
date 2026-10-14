// P31 Forge — workspace surface adapters (STUBS).
// Each accepts the workspace surface's export JSON and returns a Document IR.
// The contract: accept unknown fields, never throw, always emit { type, meta, blocks }.
// Fill in the field mapping when each surface's export schema is fixed.

export function fromDocs(exportJson) {
  return { type: 'brief', meta: { title: exportJson?.title ?? 'Untitled', source: 'docs' }, blocks: [{ kind: 'prose', data: { text: exportJson?.body ?? '' } }] }
}

export function fromSheets(exportJson) {
  return { type: 'table-report', meta: { title: exportJson?.title ?? 'Sheet', source: 'sheets' }, blocks: [{ kind: 'table', data: { columns: exportJson?.columns ?? [], rows: exportJson?.rows ?? [] } }] }
}

export function fromSlides(exportJson) {
  return { type: 'deck', meta: { title: exportJson?.title ?? 'Deck', source: 'slides' }, blocks: (exportJson?.slides ?? []).map((s, i) => ({ kind: 'section', id: `slide-${i}`, title: s?.title ?? `Slide ${i + 1}`, children: [{ kind: 'prose', data: { text: s?.body ?? '' } }] })) }
}

export function fromMail(exportJson) {
  return { type: 'letter', meta: { title: exportJson?.subject ?? 'Letter', source: 'mail' }, blocks: [{ kind: 'email', data: { subject: exportJson?.subject, greeting: exportJson?.greeting, paragraphs: exportJson?.body ? [exportJson.body] : [], signoff: exportJson?.signoff } }, ...(exportJson?.signature ? [{ kind: 'signature', data: exportJson.signature }] : [])] }
}

export function fromCalendar(exportJson) {
  return { type: 'agenda', meta: { title: exportJson?.title ?? 'Agenda', source: 'calendar' }, blocks: [{ kind: 'timeline', data: { entries: exportJson?.entries ?? [] } }] }
}

export function fromPassports(exportJson) {
  return { type: 'credential', meta: { title: exportJson?.name ?? 'Credential', source: 'passports' }, blocks: [{ kind: 'prose', data: { text: exportJson?.detail ?? '' } }] }
}

export const surfaces = { docs: fromDocs, sheets: fromSheets, slides: fromSlides, mail: fromMail, calendar: fromCalendar, passports: fromPassports }