#!/usr/bin/env node
/**
 * human-eye-test — the six-dimension human-eye rubric (M4, WP-HET).
 *
 * Scores each document on: claim traceability, verification cost, provenance
 * visibility, decision auditability, cognitive load (Flesch-Kincaid), and
 * completeness. The board-facing docs must pass the readability ceiling.
 *
 * Usage: node scripts/human-eye-test.mjs --target <pack.json>
 * Exit 0 = passes the rubric; 1 = a dimension failed.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const TARGET = process.argv.find((a, i) => a === '--target' && process.argv[i + 1])
  ? process.argv[process.argv.indexOf('--target') + 1]
  : null

if (!TARGET) {
  console.error('usage: node scripts/human-eye-test.mjs --target <pack.json>')
  process.exit(2)
}
if (!existsSync(TARGET)) {
  console.error(`human-eye-test: target pack not found: ${TARGET}`)
  process.exit(1)
}

const pack = JSON.parse(readFileSync(TARGET, 'utf8'))
const evidence = pack.body?.filter((b) => b.type === 'evidence') ?? []
const failures = []

// 1. Claim traceability — every claim has a source.
const noSource = evidence.filter((e) => !e.source)
if (noSource.length > 0) failures.push(`traceability: ${noSource.length} evidence blocks missing source`)

// 2. Verification cost — every block has a cost; sum ≤ 30 min.
const noCost = evidence.filter((e) => !e.verificationCostMinutes)
if (noCost.length > 0) failures.push(`verification-cost: ${noCost.length} blocks missing verificationCostMinutes`)
const totalCost = evidence.reduce((s, e) => s + (Number(e.verificationCostMinutes) || 0), 0)
if (totalCost > 30) failures.push(`verification-cost: ${totalCost}min > 30min fatigue threshold`)

// 3. Provenance visibility — replay commands present.
const noReplay = evidence.filter((e) => !e.replayCommand)
if (noReplay.length > 0) failures.push(`provenance: ${noReplay.length} blocks missing replayCommand`)

// 4. Decision auditability — verified date present.
const noVerified = evidence.filter((e) => !e.verified)
if (noVerified.length > 0) failures.push(`auditability: ${noVerified.length} blocks missing verified`)

// 5. Cognitive load — Flesch-Kincaid approximation (syllable-based).
function fkGrade(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const sentences = (text.match(/[.!?](?=\s|$)/g) ?? []).length || 1
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0)
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59
}
function countSyllables(word) {
  const m = word.toLowerCase().match(/[aeiouy]{1,2}/g)
  return m ? m.length : 1
}
const prose = evidence.map((e) => `${e.claim} ${e.value}`).join(' ')
const fk = fkGrade(prose)
const ceiling = pack.kind === 'resolution' ? 12 : 14
if (fk > ceiling) failures.push(`cognitive-load: Flesch-Kincaid ${fk.toFixed(1)} > ceiling ${ceiling}`)

// 6. Completeness — aspirational/known-limits present in prose.
if (!JSON.stringify(pack).match(/boundary|honest|known|cannot/i)) {
  failures.push('completeness: no honest-boundary disclosure')
}

const passed = failures.length === 0
console.log(`${passed ? '✅' : '✗'} human-eye-test ${TARGET}`)
console.log(`  evidence=${evidence.length} · FKGL=${fk.toFixed(1)} (ceiling ${ceiling}) · cost=${totalCost}min`)
for (const f of failures) console.log(`  - ${f}`)
process.exit(passed ? 0 : 1)