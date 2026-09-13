import fs from 'fs';
import path from 'path';

const SPECS_DIR = path.join(process.cwd(), 'specs');
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'generated', 'contracts');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function emitContracts() {
  ensureDir(OUTPUT_DIR);
  const components = fs.readdirSync(SPECS_DIR).filter((f) => fs.statSync(path.join(SPECS_DIR, f)).isDirectory());
  const index = {};
  for (const component of components) {
    const src = path.join(SPECS_DIR, component, 'tokens.json');
    if (!fs.existsSync(src)) continue;
    const content = JSON.parse(fs.readFileSync(src, 'utf8'));
    const out = path.join(OUTPUT_DIR, `${component}.json`);
    fs.writeFileSync(out, JSON.stringify(content, null, 2));
    index[component] = content;
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`[contracts] Emitted ${components.length} component contracts to ${OUTPUT_DIR}`);
}

emitContracts();
