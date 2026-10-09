#!/usr/bin/env node
/**
 * BUILD: Sovereign Stack Governance Suite
 * ========================================
 * Compiles the governance content packs from content/governance/
 * into ../out/ in one shot. Run docx_to_pdf.py after to get PDFs.
 *
 * Usage:
 *   node scripts/build-governance.js
 *
 * Outputs (to ../out/):
 *   P31_Sovereign_Stack_Governance_Overview.docx
 *   P31_Resolution_Adopt_Sovereign_Stack_Governance.docx
 */

const path = require('path');
const { compileFile } = require('../forge');

const PACKS = [
  'content/governance/sovereign_stack_overview.json',
  'content/governance/adopt_sovereign_stack_governance.json',
  'content/governance/jitterbug_human_eye_test.json',
  'content/governance/research_audit_verification.json'
];

async function main() {
  const root = path.resolve(__dirname, '..');
  console.log('P31 FORGE — Building Sovereign Stack governance suite');
  console.log('═'.repeat(60));

  for (const packPath of PACKS) {
    const full = path.resolve(root, packPath);
    const out = await compileFile(full);
    console.log(`  ✅ ${path.basename(packPath)} → ${path.relative(root, out)}`);
  }

  console.log('═'.repeat(60));
  console.log('Governance suite compiled. Run "npm run pdf" for PDF bridge.');
}

main().catch((e) => {
  console.error('Build failed:', e.message);
  process.exit(1);
});