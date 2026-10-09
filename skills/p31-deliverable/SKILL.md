---
name: p31-deliverable
description: >
  Use this skill when the user asks to create, generate, style, or reformat a
  professional deliverable — report, proposal, deck, brief, annual report,
  impact report, grant application, whitepaper, or one-pager. Triggers on:
  "make a report", "create a deck", "build a proposal", "style this document",
  "reformat this", "polished PDF", "client-ready document", "impact report",
  "give it some style". Applies the P31 token-based design system. Output is
  print-ready, accessibility-compliant, and every claim carries a source.
license: MIT
metadata:
  version: "1.0"
  category: document-generation
  source: "research 2026-09-23 (VisualBest, Ethical Design Co., MiniMax-PDF, Anil Dash better-documents, DeckDown)"
---

# P31 Deliverable Skill

Three routes. One design system. Restraint over expression.

**Before any CREATE or REFORMAT, read `DESIGN.md` (the token contract) and `VERIFIED_FACTS.md` (the claim ledger).** These are the source of truth for style and for facts.

## 1 · The design philosophy (the 2026 bar)

A deliverable must be, at minimum:
1. **Readable on a phone.** Digital-first; ~90% of reading happens on screens.
2. **Accessible to a screen reader.** WCAG 2.1 AA contrast, logical reading order, real headings.
3. **Visually distinctive without being loud.** Restraint carries credibility.
4. **Scannable in under two minutes.** One story, one number, one ask.

Two failure modes to avoid (Anil Dash, *better-documents*):
- **The buried ask** — opening with context instead of conclusions. Put the ask where it can be missed last, not first.
- **Formatting overload** — emphasis everywhere, decorative underlines, color proliferation, filler visuals. If everything is bold, nothing is.

The P31 correction: **lead with impact, not administration.** The first page is the most valuable space. Data goes inside. People go on the cover.

## 2 · The token system

All style flows through named tokens. **No hardcoded hex. No arbitrary sizes. No "make it pop."**

### 2.1 P31 tokens (for on-brand deliverables)

| Token | Scene (dark) | Hub (light) | Use |
|---|---|---|---|
| `--doc-bg` | `oklch(10% 0.01 240)` | `oklch(97% 0.01 85)` | Page background |
| `--doc-surface` | `oklch(16% 0.015 240)` | `oklch(100% 0.005 90)` | Cards, panels |
| `--doc-text` | `oklch(96% 0.005 240)` | `oklch(22% 0.015 80)` | Primary text |
| `--doc-text-secondary` | `oklch(78% 0.01 240)` | `oklch(38% 0.015 80)` | Supporting text |
| `--doc-accent` | `oklch(65% 0.18 195)` cyan | `oklch(55% 0.15 40)` terracotta | Primary action |
| `--doc-accent-gold` | `oklch(80% 0.16 85)` | `oklch(62% 0.14 80)` | Warm highlight |
| `--doc-verified` | `oklch(72% 0.14 155)` | `oklch(55% 0.13 150)` | Chain-verified |
| `--doc-broken` | `oklch(62% 0.15 25)` | `oklch(55% 0.15 25)` | Broken / refused |
| `--doc-font-display` | `JetBrains Mono` | `Lora, Georgia, serif` | Headlines |
| `--doc-font-body` | `Plus Jakarta Sans` | `Plus Jakarta Sans` | Body |
| `--doc-font-mono` | `JetBrains Mono` | `JetBrains Mono` | Labels, hashes |

**Rules:** never `#000` or `#fff` (the warmth is the brand). Every size from the type scale (§2.3). Every space from the 8px grid.

### 2.2 Document-type registry

| type | palette | cover | best for |
|---|---|---|---|
| `report` | deep-ink-teal | fullbleed | data-driven reports, technical deep-dives, governance updates |
| `proposal` | near-black-amber | split | grant applications, partnership proposals, SOWs |
| `resume` | ink-cream | typographic | CVs, bios, team pages |
| `portfolio` | near-black-glow | atmospheric | creative portfolios, launch decks |
| `academic` | light-classical | typographic | research papers, whitepapers, DOI-linked publications |
| `editorial` | warm-cream-bebas | editorial | thought leadership, essays |
| `impact` | warm-cream-gold | colorblock | nonprofit impact reports, annual reports, donor updates |
| `grant` | near-black-amber | split | grant applications, LOIs, concept notes |
| `deck` | white-restrained-blue | minimal | pitch decks, executive briefings |
| `one-pager` | white-restrained-blue | minimal | the ask, the proof, the contact |

Resolve the type from the request. If ambiguous, ask once, then commit.

### 2.3 The type scale (1.250 major third)

| Level | size | weight | tracking |
|---|---|---|---|
| Display XL | 64px | 400 | −0.02em |
| H1 | 48px | 400 | −0.015em |
| H2 | 32px | 400 | −0.01em |
| H3 | 24px | 600 | — |
| Body | 16px | 400 | — |
| Small | 14px | 400 | — |
| Label | 11px | 500 | +0.25em uppercase |
| Code | 13px | 400 | — |

Heading hierarchy is **size + weight**, never arbitrary. The 8px grid governs spacing: 4, 8, 12, 16, 24, 32, 48, 64.

## 3 · The cover system

Every cover has **four essential elements** (Acton Circle / ARA):
1. Organization name or logo
2. Report title + reporting period
3. **A theme line** — one sentence for the year's narrative (the differentiator)
4. **A single striking number** — set enormous

**The cover test:** remove all text except the theme line and the striking number. Does it still communicate the subject? If not, simplify.

Cover patterns (MiniMax-PDF token system): `fullbleed` · `split` · `typographic` · `atmospheric` · `minimal` · `editorial` · `magazine` · `colorblock` · `stripe` · `frame`. Pick the one mapped to the document type. Commit.

## 4 · The page system

```
1. COVER            — org, title, period, theme line, striking number
2. ONE-PAGE EXEC    — the whole story in one page (for scanners)
3. TABLE OF CONTENTS — clickable, with section summaries
4. THE BODY         — sections with pull quotes, visual anchors, chapter summaries
5. THE EVIDENCE     — data visualizations, verified metrics, live URLs
6. THE ASK          — what you want the reader to do
7. APPENDIX         — raw tables, methodology, sources
```

**The dual contract:** a reader who stops after page 2 knows the story; a reader who reads all 50 pages finds nothing missing. Both must hold.

### Section template

```
EYEBROW (mono, uppercase, accent)
SECTION TITLE (Lora, 48px)
SECTION SUMMARY (one sentence, the takeaway)
[body: 16px, 1.6 line-height, max 72ch]
[ pull quotes: Lora italic, accent border-left, 24px ]
[ visual anchors: charts, stat cards ]
[ evidence blocks: mono, tertiary, 80% opacity ]
CHAPTER SUMMARY (for skimmers, one line, accent)
```

### Evidence block

Every factual claim carries a source block:

```
✓  Agent observability & governance market
   $1.68B (2026) → $8.62B (2031), 38.69% CAGR
   Source: Mordor Intelligence — mordorintelligence.com/...
   Verified: 2026-09-23
```

**No claim without a source. No source without a date. No date without a verifiable URL.**

## 5 · Route CREATE — the pipeline

1. **Resolve document type** → full token set from §2.2.
2. **Generate the cover** → pattern + four essential elements + striking number.
3. **Write the one-page exec summary** → the whole story, one page.
4. **Generate the body** → sections, pull quotes, visual anchors, chapter summaries.
5. **Generate the evidence page** → every claim with a source block (pull from `VERIFIED_FACTS.md`).
6. **Write the ask** → one clear action.
7. **Generate the appendix** → raw tables, methodology, sources.
8. **Render to PDF** → print stylesheet (§6).
9. **Run the accessibility gate** → contrast, reading order, alt text, heading hierarchy.
10. **Run the acceptance gate** (§7).

## 6 · The tooling pipeline

| Stage | Tool | Why |
|---|---|---|
| Author | Markdown + YAML frontmatter | readable, git-friendly, diffable |
| Tokenize | `DESIGN.md` / this skill | single source of truth |
| Render | DeckDown · MdToX · Fullbleed | deterministic PDF/PNG/PPTX |
| Style | CSS `@media print` stylesheet | print-ready: light theme, page-break control |
| Verify | accessibility + acceptance gates | contrast, hierarchy, reading order |

Print stylesheet essentials:

```css
@media print {
  :root { --doc-bg: #ffffff; --doc-text: #141413; }  /* force light, save ink */
  header, nav, .sidebar, button, .no-print { display: none !important; }
  h1, h2, h3 { break-after: avoid; }
  .card, .evidence-block { break-inside: avoid; }
  body { font-size: 11pt; line-height: 1.5; }
  @page { margin: 20mm; }
  @page :first { margin: 0; }  /* full-bleed cover */
}
```

Local-first: author Markdown, render locally, deterministic PDF. No hosted editor, no lock-in.

## 7 · Route REVIEW — the five passes

Produce a structured report with severity levels (CRITICAL / MAJOR / MINOR) and specific fixes:

1. **Audience & Purpose** — buried ask? author-centered opening? missing stakes?
2. **Structure & Sequencing** — creation-order doc? murder-mystery structure? key info in speaker notes?
3. **Formatting Restraint** — emphasis overload? decorative underlines? color proliferation? filler visuals?
4. **Wayfinding & Density** — no orientation? unsummarized data? unanswerable questions? dense prose?
5. **Naming & Versioning** — generic title? recipient-first naming? `_final_final`?

## 8 · The quality gates (no exceptions)

**Content:**
- [ ] every claim has a source block (grep `Source:` ≥ claim count)
- [ ] no banned phrases (`AI-powered|revolutionary|seamlessly|next-generation`)
- [ ] every URL resolves HTTP 200
- [ ] no fabricated metrics (every number has a file, URL, or test run)
- [ ] headline is sentence case
- [ ] one-page exec summary exists
- [ ] one clear ask (`Contact:` present)

**Design:**
- [ ] no hardcoded hex in body (only in token file)
- [ ] every color is a `var(--doc-*)` reference
- [ ] type scale consistent (H1 > H2 > H3 > body)
- [ ] spacing on the 8px grid
- [ ] contrast passes WCAG 2.1 AA (body ≥ 4.5:1, large ≥ 3:1)
- [ ] cover has all four essential elements

**Render:**
- [ ] PDF renders clean (exit 0)
- [ ] print stylesheet applies (light theme, no chrome)
- [ ] file size reasonable (< 10MB for 50 pages)

## 9 · The one-page summary

> **Philosophy:** restraint over expression. Lead with impact. Design for scanning. Every claim carries a source.
> **Tokens:** three tiers, nine document types, one registry. No hardcoded hex, no arbitrary sizes.
> **Cover:** four essential elements, ten patterns, one striking number.
> **Page:** cover → exec → TOC → body → evidence → ask → appendix.
> **Skill:** CREATE / REFORMAT / REVIEW routes, outcome-based instructions, four questions answered (what, from where, how structured, what decisions).
> **Pipeline:** Markdown → tokens → render → print stylesheet → accessibility → acceptance.
> **Gates:** content + design + render + five-pass review. No exceptions.
> **The standard:** a senior designer at Anthropic, a brand lead at Stripe, or a communications director at a major foundation would look at the output and say *"this is considered."*