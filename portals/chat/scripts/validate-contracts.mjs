import fs from 'fs';
import path from 'path';

const CONTRACTS_DIR = path.join(process.cwd(), 'src', 'generated', 'contracts');
const INDEX = path.join(CONTRACTS_DIR, 'index.json');

if (!fs.existsSync(INDEX)) {
  console.error('[contracts] index.json not found. Run `pnpm contracts:emit` first.');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const errors = [];
const warnings = [];

for (const [name, contract] of Object.entries(index)) {
  const c = contract;
  if (!c.token_contract) errors.push(`${name}: missing token_contract`);
  if (!c.required_aria) warnings.push(`${name}: missing required_aria`);
  if (!c.interaction_states) warnings.push(`${name}: missing interaction_states`);
  if (!c.spoon_contract) warnings.push(`${name}: missing spoon_contract`);
}

if (errors.length) {
  console.error('[contracts] VALIDATION FAILED');
  for (const err of errors) console.error(`  ✘ ${err}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn('[contracts] VALIDATION WARNINGS');
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
}

console.log(`[contracts] Validated ${Object.keys(index).length} contracts: 0 errors, ${warnings.length} warnings`);
