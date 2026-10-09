import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, '..', 'public', 'p31-shell.mcp.json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
} catch (e) {
  console.error(`✗ manifest invalid: cannot read or parse — ${e.message}`);
  process.exit(1);
}

const required = ['name', 'version', 'description', 'capabilities', 'mcpServers'];
for (const key of required) {
  if (!(key in manifest)) {
    console.error(`✗ manifest invalid: missing required field "${key}"`);
    process.exit(1);
  }
}

if (!Array.isArray(manifest.mcpServers)) {
  console.error('✗ manifest invalid: mcpServers must be an array');
  process.exit(1);
}

for (let i = 0; i < manifest.mcpServers.length; i++) {
  const s = manifest.mcpServers[i];
  const url = s.url;
  if (!url || typeof url !== 'string') {
    console.error(`✗ manifest invalid: mcpServers[${i}] missing "url"`);
    process.exit(1);
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error(`✗ manifest invalid: mcpServers[${i}] url "${url}" is not absolute`);
    process.exit(1);
  }
}

console.log('✓ manifest valid');
process.exit(0);
