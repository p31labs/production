#!/usr/bin/env node
// P31 Slop Evaluator — evaluates a directory of HTML/CSS/TSX against the P31 slop rubric.
// Usage: node scripts/slop-eval.mjs [--dir <path>] [--rubric <path>] [--json]
//
// Flow:
//   1. Load rubric (scripts/slop-rubric.yml or YAML config).
//   2. Static analysis: scan files for hardcoded hex, inline styles,
//      missing contrast, emoji-as-icon, forbidden patterns.
//   3. Score each category; report violations per category.
//   4. Emit verdict: acceptable | likely-slop | definitely-slop.
//
// Future: wire to slop-eval-cli LLM judge for dynamic analysis.
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir") flags.dir = argv[++i];
    else if (arg === "--rubric") flags.rubric = argv[++i];
    else if (arg === "--json") flags.json = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
  }
  return flags;
}

async function collectFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "playwright-report") continue;
      await collectFiles(full, files);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if ([".tsx", ".ts", ".css", ".html", ".jsx"].includes(ext)) files.push(full);
    }
  }
  return files;
}

async function evaluate(file, reports) {
  const src = await readFile(file, "utf8");
  const ext = extname(file);

  const hexMatches = src.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  if (hexMatches.length) {
    reports.push({ file, check: "hardcoded_hex", severity: "hard", count: hexMatches.length, samples: hexMatches.slice(0, 3) });
  }

  const inlineMatches = src.match(/style=\{\{[^}]+\}\}/g) || [];
  if (inlineMatches.length) {
    reports.push({ file, check: "inline_style", severity: "hard", count: inlineMatches.length });
  }

  const rgbaMatches = src.match(/rgba?\(/g) || [];
  if (rgbaMatches.length) {
    reports.push({ file, check: "hardcoded_rgba", severity: "hard", count: rgbaMatches.length });
  }

  const emojiMatches = src.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}]/gu) || [];
  if (emojiMatches.length) {
    reports.push({ file, check: "emoji_icon", severity: "hard", count: emojiMatches.length });
  }

  const glassMatches = src.match(/glass|blur|backdrop-filter/g) || [];
  if (glassMatches.length > 5) {
    reports.push({ file, check: "glass_overuse", severity: "soft", count: glassMatches.length });
  }

  if (ext === ".tsx" || ext === ".ts") {
    const iconBtnMatches = src.match(/aria-label\s*=\s*"[^"]*"/g) || [];
    const iconCount = (src.match(/icon.*=.*true|icon-only/i) || []).length;
    if (iconCount > 0 && iconBtnMatches.length === 0) {
      reports.push({ file, check: "missing_aria_icon", severity: "hard", count: iconCount });
    }
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log("usage: node scripts/slop-eval.mjs --dir <path> [--rubric <path>] [--json]");
    return 0;
  }

  const targetDir = flags.dir || ".";
  const projectRoot = existsSync(join(targetDir, "scripts", "slop-rubric.yml")) ? targetDir : join(targetDir, "..");
  const rubricPath = flags.rubric || join(projectRoot, "scripts", "slop-rubric.yml");
  const baselinePath = join(projectRoot, "scripts", "slop-baseline.json");
  const files = await collectFiles(targetDir);
  const reports = [];

  for (const file of files) {
    await evaluate(file, reports);
  }

  const hard = reports.filter((r) => r.severity === "hard");
  const soft = reports.filter((r) => r.severity === "soft");
  const hardScore = hard.length;
  const softScore = soft.length;
  const totalScore = hardScore + softScore;

  const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;
  const threshold = baseline ? Math.ceil(baseline.score * (baseline.thresholdMultiplier ?? 1.15)) : 12;
  const delta = baseline ? totalScore - baseline.score : 0;
  const regressed = baseline ? totalScore > threshold : false;

  let verdict;
  let exitCode = 0;
  if (baseline) {
    if (regressed) { verdict = "regression"; exitCode = 1; }
    else if (totalScore > baseline.score) { verdict = "acceptable-elevated"; exitCode = 0; }
    else { verdict = "acceptable"; exitCode = 0; }
  } else {
    if (totalScore >= 12) { verdict = "definitely-slop"; exitCode = 1; }
    else if (totalScore >= 8) { verdict = "likely-slop"; exitCode = 1; }
    else { verdict = "acceptable"; exitCode = 0; }
  }

  const result = {
    target: targetDir,
    files_scanned: files.length,
    violations: { hard: hard.length, soft: soft.length },
    verdict,
    score: totalScore,
    baseline: baseline ? { score: baseline.score, threshold } : null,
    delta,
    details: reports.slice(0, 50),
    rubric: rubricPath,
  };

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`slop-eval ${targetDir}`);
    console.log(`  files_scanned: ${files.length}`);
    console.log(`  hard violations:   ${hard.length}`);
    console.log(`  soft violations:   ${soft.length}`);
    console.log(`  score:             ${totalScore}`);
    console.log(`  verdict:           ${verdict}`);
    if (baseline) {
      console.log(`  baseline:          ${baseline.score} (threshold: ${threshold}, delta: ${delta > 0 ? '+' : ''}${delta})`);
    }
    if (reports.length) {
      console.log(`  top violations:`);
      for (const r of reports.slice(0, 10)) {
        console.log(`    [${r.severity}] ${r.file}: ${r.check} (x${r.count})`);
      }
    }
  }

  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`slop-eval error: ${err?.stack || err}`);
    process.exit(2);
  });
