#!/usr/bin/env node
/**
 * SBOM generation for the P31 Capital Machine portal.
 *
 * - Runs @cyclonedx/cdxgen via npx when it is already available (--no-install).
 * - Falls back to a minimal CycloneDX 1.5 document (metadata + empty components)
 *   when cdxgen is not installed, so the evidence pipeline never hard-fails.
 * - Writes dist/trust/sbom.cdx.json plus a sha256 digest (dist/trust/sbom.sha256).
 *
 * Production signing uses the in-house ML-DSA-65 + Ed25519 hybrid keys (p31-crypto)
 * as the trust anchor — documented here and in docs/TRUST.md; actual key signing is
 * a future step when a signing worker/endpoint is wired.
 */
import { execSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const OUT = join(ROOT, 'dist', 'trust', 'sbom.cdx.json');
const DIGEST_OUT = join(ROOT, 'dist', 'trust', 'sbom.sha256');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

mkdirSync(dirname(OUT), { recursive: true });

/** Try cdxgen (never installs). Returns true when it produced a BOM. */
function runCdxgen() {
  try {
    execSync('npx --no-install @cyclonedx/cdxgen --version', { stdio: 'pipe', timeout: 15000 });
    execSync('npx --no-install @cyclonedx/cdxgen -o dist/trust/sbom.cdx.json -t js --spec-version 1.5', {
      stdio: 'inherit',
      cwd: ROOT,
      timeout: 120000,
    });
    return existsSync(OUT);
  } catch {
    return false;
  }
}

/** Minimal CycloneDX 1.5 BOM — used when cdxgen is unavailable. */
function emitMinimal() {
  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: { type: 'application', name: pkg.name ?? '@p31ca/monetization-portal', version: pkg.version ?? '0.0.0' },
      tools: [{ vendor: 'P31', name: 'scripts/sbom.mjs', version: '1.0.0' }],
      properties: [
        { name: 'note', value: '@cyclonedx/cdxgen not installed; minimal inventory emitted. Regenerate with: npx @cyclonedx/cdxgen -t js -o dist/trust/sbom.cdx.json' },
        { name: 'signing', value: 'Production signing uses in-house ML-DSA-65 + Ed25519 hybrid keys (p31-crypto) as the trust anchor; actual key signing is a future step when a signing worker/endpoint is wired.' },
      ],
    },
    components: [],
  };
  writeFileSync(OUT, `${JSON.stringify(bom, null, 2)}\n`);
  console.log('  sbom: cdxgen not available — minimal CycloneDX 1.5 BOM emitted.');
}

if (!runCdxgen()) emitMinimal();

const raw = readFileSync(OUT, 'utf8');
const digest = createHash('sha256').update(raw).digest('hex');
writeFileSync(DIGEST_OUT, `${digest}  dist/trust/sbom.cdx.json\n`);

console.log(`sbom written to ${OUT}`);
console.log(`sha256 digest written to ${DIGEST_OUT} (${digest})`);
console.log('signing: production signing uses the in-house ML-DSA-65 + Ed25519 hybrid keys (p31-crypto) as the trust anchor — documented; actual key signing is a future step when a signing worker/endpoint is wired.');