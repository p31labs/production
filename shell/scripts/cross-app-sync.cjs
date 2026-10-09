#!/usr/bin/env node

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const SHELL_DIR = '/home/p31/production/shell';
const SPACESHIP_DIR = '/home/p31/production/packages/spaceship-earth';

const CHECKS = [
  {
    name: 'Shell: useFocusTrap hook exists',
    test: () => existsSync(join(SHELL_DIR, 'src/hooks/useFocusTrap.ts')),
  },
  {
    name: 'Spaceship: useFocusTrap hook exists',
    test: () => existsSync(join(SPACESHIP_DIR, 'src/hooks/useFocusTrap.ts')),
  },
  {
    name: 'Shell: skip link in App.tsx',
    test: () => readFileSync(join(SHELL_DIR, 'src/App.tsx'), 'utf-8').includes('skip-link'),
  },
  {
    name: 'Shell: :focus-visible CSS',
    test: () => readFileSync(join(SHELL_DIR, 'src/index.css'), 'utf-8').includes(':focus-visible'),
  },
  {
    name: 'Shell: aria-description on high-risk actions',
    test: () => {
      const content = readFileSync(join(SHELL_DIR, 'src/components/NotificationHub.tsx'), 'utf-8');
      return content.includes('aria-description');
    },
  },
  {
    name: 'Shell: _headers file exists',
    test: () => existsSync(join(SHELL_DIR, 'public/_headers')),
  },
  {
    name: 'Shell: CSP in _headers',
    test: () => readFileSync(join(SHELL_DIR, 'public/_headers'), 'utf-8').includes('Content-Security-Policy'),
  },
  {
    name: 'Shell: security headers in worker.ts',
    test: () => readFileSync(join(SHELL_DIR, 'src/worker.ts'), 'utf-8').includes('Strict-Transport-Security'),
  },
  {
    name: 'Shell: /api/shell-state endpoint returns JSON',
    test: async () => {
      const res = await fetch('https://p31-shell.trimtab-signal.workers.dev/api/shell-state');
      const json = await res.json();
      return res.ok && typeof json.service === 'string' && typeof json.state === 'object';
    },
  },
  {
    name: 'Shell: /api/status aggregates shell + spaceship',
    test: async () => {
      const res = await fetch('https://p31-shell.trimtab-signal.workers.dev/api/status');
      const json = await res.json();
      return res.ok && typeof json.shell === 'object' && typeof json.spaceship === 'object';
    },
  },
  {
    name: 'Spaceship: /api/spaceship-state endpoint returns JSON',
    test: async () => {
      const res = await fetch('https://spaceship-relay.trimtab-signal.workers.dev/api/spaceship-state');
      const json = await res.json();
      return res.ok && typeof json.service === 'string' && typeof json.state === 'object';
    },
  },
  {
    name: 'Shell: useCrossAppState hook exists',
    test: () => readFileSync(join(SHELL_DIR, 'src/hooks/useCrossAppState.ts'), 'utf-8').includes('createCrossAppState'),
  },
  {
    name: 'Spaceship: useCrossAppState hook exists',
    test: () => readFileSync(join(SPACESHIP_DIR, 'src/hooks/useCrossAppState.ts'), 'utf-8').includes('createCrossAppState'),
  },
  {
    name: 'Spaceship: security headers on Pages deployment',
    test: async () => {
      const res = await fetch('https://spaceship-earth.pages.dev', { redirect: 'manual' });
      const headers = {};
      for (const [key, value] of res.headers) {
        headers[key.toLowerCase()] = value;
      }
      return headers['strict-transport-security'] && headers['x-content-type-options'] && headers['x-frame-options'];
    },
  },
  {
    name: 'Shell: all overlays use useFocusTrap',
    test: () => {
      const files = [
        'src/components/MemberDashboard.tsx',
        'src/components/McpExplorer.tsx',
        'src/components/AkinatorPanel.tsx',
        'src/components/SBTPanel.tsx',
        'src/components/JusticePanel.tsx',
        'src/components/NodeZeroPanel.tsx',
        'src/components/MeshStatusPanel.tsx',
        'src/components/MarketplacePanel.tsx',
        'src/components/ConfirmDialog.tsx',
        'src/components/RestOverlay.tsx',
      ];
      return files.every(f => readFileSync(join(SHELL_DIR, f), 'utf-8').includes('useFocusTrap'));
    },
  },
  {
    name: 'Spaceship: RestOverlay uses useFocusTrap',
    test: () => readFileSync(join(SPACESHIP_DIR, 'src/components/RestOverlay.tsx'), 'utf-8').includes('useFocusTrap'),
  },
];

async function main() {
  let passed = 0;
  let failed = 0;

  console.log('=== Cross-App Sync Verification ===\n');

  for (const check of CHECKS) {
    try {
      const result = await check.test();
      if (result) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ${check.name} (error: ${err.message})`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}/${CHECKS.length}`);
  console.log(`Failed: ${failed}/${CHECKS.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
