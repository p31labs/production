#!/usr/bin/env node
const { execSync } = require('child_process');

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ee05f70c889cb6f876b9925257e3a2fa';

if (!API_TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN environment variable is required');
  process.exit(1);
}

const DOMAINS = [
  { project: 'p31-portal-children',      domain: 'willow.p31ca.org' },
  { project: 'p31-portal-parent',        domain: 'tetra.p31ca.org' },
  { project: 'p31-portal-teen',          domain: 'sixseven.p31ca.org' },
  { project: 'p31-portal-meatspace',     domain: 'meatspace.p31ca.org' },
  { project: 'p31-portal-developer',     domain: 'p31ca.org' },
  { project: 'p31-portal-institutional', domain: 'phosphorus31.org' },
  { project: 'p31-portal-design',        domain: 'design.p31ca.org' },
];

async function addDomain(project, domain) {
  // Check if domain already exists
  const checkCmd = `curl -s -H "Authorization: Bearer ${API_TOKEN}" "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${project}/domains"`;
  const existing = JSON.parse(execSync(checkCmd).toString());
  if (existing.success && existing.result?.some(d => d.name === domain)) {
    console.log(`  ${domain} already exists on ${project}`);
    return true;
  }

  // Add domain
  const cmd = `curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${project}/domains" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"name":"${domain}"}'`;
  const result = JSON.parse(execSync(cmd).toString());
  if (result.success) {
    console.log(`  ✅ ${domain} → ${project} (added, awaiting DNS)`);
    return true;
  } else if (result.errors?.[0]?.code === 10020) {
    console.log(`  ⚠️  ${domain}: zone not found on this Cloudflare account`);
    return false;
  } else {
    console.log(`  ❌ ${domain}: ${result.errors?.[0]?.message || JSON.stringify(result.errors)}`);
    return false;
  }
}

(async () => {
  const only = process.argv.slice(2).filter(a => a.startsWith('--only='))[0];
  const filter = only ? new Set(only.slice(7).split(',')) : null;
  console.log('Adding custom domains to Pages projects...');
  for (const { project, domain } of DOMAINS) {
    if (filter && !filter.has(project)) continue;
    console.log(`\n${project}:`);
    await addDomain(project, domain);
  }
  console.log('\nDone. Go to Cloudflare Dashboard → Pages → each project → Custom Domains to verify DNS status.');
})();
