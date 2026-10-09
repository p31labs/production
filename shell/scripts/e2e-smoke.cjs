#!/usr/bin/env node

const CHECKS = [
  {
    name: 'Shell Worker',
    url: 'https://p31-shell.trimtab-signal.workers.dev',
    headers: ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'permissions-policy', 'referrer-policy'],
  },
  {
    name: 'Spaceship Earth Pages',
    url: 'https://spaceship-earth.pages.dev',
    headers: ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'permissions-policy', 'referrer-policy'],
  },
];

const REQUIRED_HEADERS = [
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'permissions-policy',
  'referrer-policy',
];

async function checkHeaders(url) {
  const res = await fetch(url, { redirect: 'manual' });
  const headers = {};
  for (const [key, value] of res.headers) {
    headers[key.toLowerCase()] = value;
  }
  return { status: res.status, headers };
}

async function main() {
  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    console.log(`\n--- ${check.name} ---`);
    try {
      const { status, headers } = await checkHeaders(check.url);
      console.log(`Status: ${status}`);

      const missing = REQUIRED_HEADERS.filter(h => !headers[h]);
      if (missing.length === 0) {
        console.log(`✅ All security headers present`);
        passed++;
      } else {
        console.log(`❌ Missing headers: ${missing.join(', ')}`);
        failed++;
      }

      if (headers['content-security-policy-report-only']) {
        console.log(`✅ CSP-Report-Only present`);
      } else if (headers['content-security-policy']) {
        console.log(`✅ CSP enforced`);
      } else {
        console.log(`⚠️  No CSP header`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
