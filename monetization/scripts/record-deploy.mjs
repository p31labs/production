#!/usr/bin/env node
/**
 * Record a DORA event to p31-ci.
 * Usage: node scripts/record-deploy.mjs <event_type> <service> [commit]
 */
import { execSync } from 'node:child_process';

const [eventType, service, commit] = process.argv.slice(2);
if (!eventType || !service) {
  console.error('Usage: node scripts/record-deploy.mjs <event_type> <service> [commit]');
  process.exit(1);
}
const CI_URL = process.env.CI_URL || 'https://p31-ci.trimtab-signal.workers.dev';
const TOKEN = process.env.CI_ISSUE_TOKEN || '';
const body = JSON.stringify({ event_type: eventType, service, commit_sha: commit ?? 'manual' });
if (!TOKEN) {
  console.error('CI_ISSUE_TOKEN unset — cannot record');
  process.exit(1);
}
execSync(`curl -s -m 15 -X POST -H 'Content-Type: application/json' -H 'X-Issue-Token: ${TOKEN}' -d '${body}' ${CI_URL}/record`);
console.log(`recorded ${eventType} for ${service}`);