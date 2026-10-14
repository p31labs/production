#!/usr/bin/env node
/**
 * @file B2-surface — MCP public-surface gate (runbook v3.0 §5 B-2, §8).
 *
 * Asserts the canonical MCP manifest is EXACTLY a 5-tool public surface
 * (Salt DS precedent, §2.2; SMALL SURFACE rule §9.17) and that every tool is
 * fail-closed — each tool definition MUST carry an `error` object with a
 * JSON-RPC error `code` and a `message` that refuses to guess.
 *
 * Fails (exit 1) when:
 *   - the manifest has anything other than exactly 5 tools (a 6th visible
 *     tool, or zero), or
 *   - any tool is missing a required key (name, description, params, returns),
 *     or
 *   - any tool's fail-closed `error` shape is missing (code + message).
 *
 * Usage:
 *   node surface-check.mjs                  # validates ./public-surface.json
 *   node surface-check.mjs <manifest.json>  # validate any manifest
 *
 * Negative control: a 6-tool manifest must fail (fixtures/surface-6tools.json).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = resolve(HERE, 'public-surface.json');
const REQUIRED_TOOL_COUNT = 5;

const REQUIRED_TOOL_KEYS = ['name', 'description', 'params', 'returns'];
const REQUIRED_ERROR_KEYS = ['code', 'message'];

function main() {
  const [manifestPath] = process.argv.slice(2);
  const file = manifestPath ? resolve(manifestPath) : DEFAULT_MANIFEST;

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`surface-check: cannot parse ${file} — ${err.message}`);
    process.exit(1);
  }

  const problems = [];
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  const count = tools.length;

  if (count !== REQUIRED_TOOL_COUNT) {
    problems.push(
      `tool count = ${count} — must be exactly ${REQUIRED_TOOL_COUNT} (a ${count > REQUIRED_TOOL_COUNT ? `${count}th visible tool` : 'truncated surface'} violates the SMALL SURFACE rule §9.17)`,
    );
  }

  const names = new Set();
  for (const tool of tools) {
    if (typeof tool !== 'object' || tool === null) {
      problems.push('a tool entry is not an object');
      continue;
    }
    const name = typeof tool.name === 'string' ? tool.name : '<missing>';
    if (names.has(name)) problems.push(`duplicate tool name: ${name}`);
    names.add(name);

    for (const key of REQUIRED_TOOL_KEYS) {
      if (!(key in tool)) problems.push(`${name}: missing required key "${key}"`);
    }

    // Fail-closed check: every tool MUST define an error object with code+message.
    const err = tool.error;
    if (typeof err !== 'object' || err === null) {
      problems.push(`${name}: missing fail-closed "error" shape (code + message)`);
    } else {
      for (const key of REQUIRED_ERROR_KEYS) {
        if (!(key in err)) problems.push(`${name}: error shape missing key "${key}"`);
      }
    }
  }

  if (problems.length === 0) {
    console.log(`surface-check: ${file}`);
    console.log(`  tools: ${count} — matches the 5-tool public surface.`);
    console.log(`  every tool is fail-closed (error { code, message } present).`);
    console.log('SURFACE: PASS');
    process.exit(0);
  }

  console.log(`surface-check: ${file}`);
  console.log(`  tools: ${count} (expected exactly ${REQUIRED_TOOL_COUNT})`);
  for (const p of problems) console.log(`  FAIL: ${p}`);
  console.log('SURFACE: FAIL');
  process.exit(1);
}

main();