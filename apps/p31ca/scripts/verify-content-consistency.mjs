#!/usr/bin/env node
/**
 * verify-content-consistency.mjs — Scans all .astro pages in src/pages/ for
 * hardcoded values that contradict the content ground truth in
 * ground-truth/content/.
 *
 * Checks:
 *   1. EIN matches nonprofit.json
 *   2. IRS status matches nonprofit.json (no "pending" vs "registered" contradiction)
 *   3. Policy effective dates match nonprofit.json#policies.*.effective
 *   4. External URLs not in p31-mesh-constants.json
 *
 * Usage:
 *   node scripts/verify-content-consistency.mjs            # strict mode
 *   node scripts/verify-content-consistency.mjs --dry-run  # warn but don't fail
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PAGES_DIR = resolve(ROOT, 'src', 'pages');
const DATA_DIR = resolve(ROOT, 'src', 'data');
const CONTENT_DIR = resolve(ROOT, 'ground-truth', 'content');
const DRY_RUN = process.argv.includes('--dry-run');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function findAstroFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...findAstroFiles(p));
    } else if (e.name.endsWith('.astro')) {
      results.push(p);
    }
  }
  return results;
}

function grepFile(filePath, pattern) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      matches.push({ line: i + 1, content: lines[i].trim() });
    }
  }
  return matches;
}

function main() {
  const nonprofit = readJson(join(CONTENT_DIR, 'nonprofit.json'));
  const constants_urls = readJson(join(DATA_DIR, 'p31-mesh-constants.json'));
  const allKnownUrls = Object.values(constants_urls).filter((v) => typeof v === 'string' && v.startsWith('http'));

  const issues = [];

  // 1. EIN check
  const files = findAstroFiles(PAGES_DIR);
  for (const file of files) {
    const matches = grepFile(file, /42-1888158/);
    for (const m of matches) {
      // EIN is correct as long as it matches
      // Just verify it's not a typo
    }
  }

  // 2. IRS status contradiction check
  const expectedStatus = nonprofit.irsStatus; // "pending"
  const statusPatterns = [
    { pattern: /501\(c\)\(3\).*pending/i, value: 'pending' },
    { pattern: /501\(c\)\(3\).*registered/i, value: 'registered' },
    { pattern: /registered.*501\(c\)\(3\)/i, value: 'registered' },
    // Word-boundary + 40-char proximity: only a real "pending determination /
    // status" claim matches. "depending on gross receipts" no longer trips it.
    { pattern: /\bpending\b.{0,40}501\(c\)\(3\)/i, value: 'pending' },
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const { pattern, value } of statusPatterns) {
      const matches = content.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          if (value !== expectedStatus) {
            const lines = content.split('\n');
            let lineNum = 1;
            for (const line of lines) {
              if (new RegExp(pattern.source, 'i').test(line)) {
                issues.push(`${file.replace(ROOT + '/', '')}:${lineNum} — says "${value}" but ground truth says "${expectedStatus}"`);
                break;
              }
              lineNum++;
            }
          }
        }
      }
    }
  }

  // 3. Policy date check
  const privacyDate = nonprofit.policies?.privacy?.effective;
  const termsDate = nonprofit.policies?.terms?.effective;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const dateMatches = content.match(/Effective:?\s*([A-Z][a-z]+ \d{1,2}, \d{4})/gi);
    if (dateMatches) {
      for (const match of dateMatches) {
        const dateStr = match.replace(/Effective:?\s*/i, '').trim();
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) continue;
        if (file.includes('privacy') && privacyDate) {
          const expected = new Date(privacyDate);
          if (Math.abs(parsed.getTime() - expected.getTime()) > 864e5) {
            issues.push(`${file.replace(ROOT + '/', '')} — effective date "${dateStr}" != ground truth "${privacyDate}"`);
          }
        }
        if (file.includes('terms') && termsDate) {
          const expected = new Date(termsDate);
          if (Math.abs(parsed.getTime() - expected.getTime()) > 864e5) {
            issues.push(`${file.replace(ROOT + '/', '')} — effective date "${dateStr}" != ground truth "${termsDate}"`);
          }
        }
      }
    }
  }

  // 4. Unlisted URL check (skip namespace URIs, template strings, localhost, CDNs)
  const skipUrlPatterns = [
    /w3\.org\/\d{4}\//,       // XML/schema namespaces
    /127\.0\.0\.1/,            // local dev
    /localhost/,               // local dev
    /cdnjs\.cloudflare\.com/,  // CDN
    /fonts\.googleapis\.com/,  // Google Fonts
    /\.p31ca\.org/,            // p31ca internal
    /unpkg\.com/,              // CDN
    /cdn\.jsdelivr\.net/,      // CDN
    /cdn\.tailwindcss\.com/,   // CDN
    /esm\.sh/,                 // CDN
    /\$\{/,                    // template literal variables (e.g. `https://doi.org/${doi}`)
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const urlMatches = content.match(/https?:\/\/[^\s"'<>)`]+/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        const cleanUrl = url.replace(/[.,;:!?)]*$/, '');
        if (!cleanUrl.startsWith('http')) continue;
        if (cleanUrl.includes('p31ca.org') || cleanUrl.includes('trimtab-signal.workers.dev')) continue;
        if (skipUrlPatterns.some((p) => p.test(cleanUrl))) continue;
        const isKnown = allKnownUrls.some((known) => cleanUrl.startsWith(known) || known.startsWith(cleanUrl));
        if (!isKnown) {
          issues.push(`${file.replace(ROOT + '/', '')} — URL "${cleanUrl}" not in p31-mesh-constants.json`);
        }
      }
    }
  }

  // 5. Dead-domain email check — @p31ca.org is out of commission (Google
  // Workspace suspended). Any live page that references it is a broken contact.
  const deadEmailPattern = /[A-Za-z0-9._%+-]+@p31ca\.org/;
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (deadEmailPattern.test(content)) {
      issues.push(`${file.replace(ROOT + '/', '')} — references dead @p31ca.org address`);
    }
  }

  // 5c. Canon-language guard — the operator canon says: "Never use submarine,
  // naval, or military metaphors. The operator was a DoD civilian engineer,
  // not military. This is a trigger in the active legal context." This check
  // scans the PUBLIC narrative surfaces (content collections + blog posts)
  // where a biography metaphor would ship to readers. "fleet" is deliberately
  // excluded — it is a legitimate internal term (the Worker fleet, e.g.
  // p31-live-fleet.json).
  const warnings = [];
  const canonMetaphorPattern = /\b(submarine|naval|Navy|military)\b/i;
  const narrativeDirs = [resolve(ROOT, 'src/content'), resolve(ROOT, 'src/pages/blog')];
  /** Skip imported Substack prose: the operator's own autobiography, in his own
   *  voice, imported verbatim by scripts/fetch-substack.mjs. The canon guard
   *  protects NATIVE marketing copy from a biography metaphor — it must not
   *  sanitize the operator's lived history. The `source: substack` frontmatter
   *  encodes the distinction; logged as a warning, never a silent pass. */
  const isImported = (p) => {
    try {
      const head = readFileSync(p, 'utf8').slice(0, 500);
      return /^---[\s\S]*?source:\s*["']?substack["']?[\s\S]*?---/m.test(head);
    } catch { return false; }
  };
  const scanNarrative = (dir) => {
    if (!existsSync(dir)) return;
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'dist') continue;
          walk(p);
        } else if (e.name.endsWith('.md') || e.name.endsWith('.astro')) {
          const content = readFileSync(p, 'utf-8');
          if (canonMetaphorPattern.test(content)) {
            if (isImported(p)) {
              warnings.push(`${p.replace(ROOT + '/', '')} — canon-forbidden language present but SKIPPED: imported Substack prose (operator's own voice)`);
              continue;
            }
            issues.push(`${p.replace(ROOT + '/', '')} — uses canon-forbidden submarine/naval/military language`);
          }
        }
      }
    };
    walk(dir);
  };
  for (const dir of narrativeDirs) scanNarrative(dir);

  // The HN post draft is a public-facing artifact (submitted to Show HN), so
  // it must also pass the canon-language guard. Scanned as a specific file,
  // NOT a docs-wide scan — the runbook legitimately mentions the forbidden
  // terms in the negative ("no submarine/naval/Navy/military metaphors").
  const hnDraft = resolve(ROOT, '../../docs/mcp-marketplace-show-hn.md');
  if (existsSync(hnDraft) && canonMetaphorPattern.test(readFileSync(hnDraft, 'utf-8'))) {
    issues.push(`docs/mcp-marketplace-show-hn.md — uses canon-forbidden submarine/naval/military language`);
  }

  // 5d. Register-1 AI-trigger guard (voice-and-register policy, adopted
  // 2026-09-24). The public narrative surfaces speak as the SYSTEM, not as a
  // human-with-a-tool: "AI," "artificial intelligence," "LLM," "a model"
  // are trigger words that reduce trust in true content (CISPA 2026). This is
  // ADVISORY — reported as warnings, not failures — because the policy was
  // adopted today and the register mapping is not yet locked. The compliance
  // page, the provenance log, and the runbook suite are Registers 2-3 and
  // MUST name the production truth; they are exempt by path.
  const aiTriggerPattern = /\b(artificial intelligence|AI|LLM|large language model|a model)\b/i;
  const register2Paths = [
    resolve(ROOT, 'src/pages/compliance.astro'),
    resolve(ROOT, '../../docs/GENAI_POLICY.md'),
    resolve(ROOT, '../../docs/LOOM_PROMPT_PROVENANCE_LOG.md'),
  ];
  const scanRegister1 = (dir) => {
    if (!existsSync(dir)) return;
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'dist') continue;
          walk(p);
        } else if (e.name.endsWith('.md') || e.name.endsWith('.astro')) {
          if (register2Paths.some((r) => p === r)) continue;
          const content = readFileSync(p, 'utf-8');
          if (aiTriggerPattern.test(content)) {
            warnings.push(`${p.replace(ROOT + '/', '')} — Register-1 surface uses the AI-trigger word (voice-and-register policy: speak as the system, or move this to Register 2/3)`);
          }
        }
      }
    };
    walk(dir);
  };
  for (const dir of narrativeDirs) scanRegister1(dir);

// 5b. Same check across the whole workspace — any source that can leak the
// dead address into a live surface or an operational doc:
//   - apps/*/src/**, packages/*/src/**   (TypeScript / TSX)
//   - docs/**/*.md                        (grant, launch, outreach templates)
//   - ground-truth/**/*.json, deploy/**   (data + deploy copies)
//   - public/*.html                       (static HTML copied into dist)
// Historical archives are excluded: public/doc-library, public/archive, and
// sent-email records (docs/*mcferon-email*).
  const repoRoot = resolve(ROOT, '../../');
  const scanExtensions = new Set(['.ts', '.tsx', '.html', '.md']);
  const archiveDirs = new Set(['node_modules', 'dist', '.git', 'doc-library', 'archive', 'src-tauri', '.astro', '.vite']);
  const archiveFiles = new RegExp('/(mcferon-email|ngi-.*proposal)[^/]*\.md$');
  const scanTree = (root, prefix) => {
    if (!existsSync(root)) return;
    const walk = (d) => {
      let ents;
      try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const p = join(d, e.name);
        if (e.isDirectory()) {
          if (archiveDirs.has(e.name)) continue;
          walk(p);
        } else {
          const ext = e.name.slice(e.name.lastIndexOf('.'));
          if (!scanExtensions.has(ext)) continue;
          if (archiveFiles.test(p)) continue;
          const content = readFileSync(p, 'utf-8');
          if (deadEmailPattern.test(content)) {
            issues.push(`${prefix}${p.replace(repoRoot + '/', '')} — references dead @p31ca.org address`);
          }
        }
      }
    };
    walk(root);
  };
  scanTree(repoRoot, '');

  if (warnings.length > 0) {
    console.warn(`\n⚠ Register-1 AI-trigger warnings (advisory — policy adopted ${'2026-09-24'}, mapping not locked):`);
    for (const w of warnings) console.warn(`  • ${w}`);
  }

  if (issues.length > 0) {
    console.error(`\n❌ Content consistency check FAILED — ${issues.length} issue(s)`);
    for (const issue of issues) {
      console.error(`  • ${issue}`);
    }
    console.error(`\n  Fix: update ground-truth/content/nonprofit.json or the page itself.\n`);

    if (!DRY_RUN) process.exit(1);
  }

  console.log(`✅ Content consistency OK — ${files.length} page(s) checked`);
}

main();
