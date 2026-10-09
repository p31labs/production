#!/usr/bin/env node
/**
 * register-mcp.mjs — registration helper for the p31-capital-machine MCP server.
 *
 * Purpose:
 *   - Always: health-check the deployed server and print the discovery metadata
 *     it would publish (.well-known/mcp).
 *   - If CDP_API_KEY is present: build and print the Coinbase x402 Bazaar
 *     resource-registration payload, and POST it when RESOURCES_REGISTRATION_URL
 *     is explicitly set.
 *   - If CDP_API_KEY is absent: print a warning and exit 0 so CI does not break.
 *   - AWS_REGION / AWS creds are optional and ignored by this script (Bedrock
 *     AgentCore registration is done via AWS CLI/console, see MCP-DISTRIBUTION.md).
 *
 * Node built-ins only (no deps). Requires Node 18+ (global fetch).
 */

import process from "node:process";

const BASE_URL = "https://p31-capital-machine-mcp.trimtab-signal.workers.dev";
const MCP_URL = `${BASE_URL}/mcp`;
const PAY_TO = "0x51c285Df171C76bE36252e32679F098d90768413";
const NETWORK = "base-sepolia";
const CURRENCY = "USDC";
const TOOL_PRICES = {
  "revenue.getSummary": "0.02",
  "positions.list": "0.01",
  "opportunities.scan": "0.01",
};
const DEFAULT_RESOURCES_URL = "https://api.coinbase.com/api/v1/x402/resources";

const log = (msg) => console.log(msg);
const err = (msg) => console.error(msg);

function section(title) {
  log(`\n--- ${title} ---`);
}

async function checkHealth() {
  section("health");
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    log(`GET ${BASE_URL}/health -> ${res.status}`);
    log(JSON.stringify(body, null, 2));
    return res.ok;
  } catch (e) {
    err(`health check failed: ${e.message}`);
    return false;
  }
}

async function fetchMetadata() {
  section("metadata (would be published)");
  try {
    const res = await fetch(`${BASE_URL}/.well-known/mcp`);
    const body = await res.json();
    log(`GET ${BASE_URL}/.well-known/mcp -> ${res.status}`);
    log(JSON.stringify(body, null, 2));
    return body;
  } catch (e) {
    err(`metadata fetch failed: ${e.message}`);
    return null;
  }
}

function buildBazaarPayload() {
  return {
    name: "p31-capital-machine",
    description:
      "x402-gated MCP server exposing P31 Capital Machine surfaces (revenue, positions, opportunities, billing).",
    url: MCP_URL,
    currency: CURRENCY,
    network: NETWORK,
    pay_to: PAY_TO,
    tools: Object.fromEntries(
      Object.entries(TOOL_PRICES).map(([name, price]) => [name, { price_usdc: price }]),
    ),
  };
}

async function registerBazaar(payload) {
  const resourcesUrl = process.env.RESOURCES_REGISTRATION_URL || DEFAULT_RESOURCES_URL;
  section("bazaar registration");
  log(`registration payload (would POST to ${resourcesUrl}):`);
  log(JSON.stringify(payload, null, 2));

  if (!process.env.RESOURCES_REGISTRATION_URL) {
    log(
      "RESOURCES_REGISTRATION_URL not set — print-only mode. " +
        "Set RESOURCES_REGISTRATION_URL to actually POST the registration.",
    );
    return { posted: false };
  }

  try {
    const res = await fetch(resourcesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CDP_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    log(`POST ${resourcesUrl} -> ${res.status}`);
    if (text) log(text);
    return { posted: res.ok, status: res.status };
  } catch (e) {
    err(`bazaar POST failed: ${e.message}`);
    return { posted: false, error: e.message };
  }
}

async function main() {
  log("=== p31-capital-machine-mcp registration script ===");
  log(`server: ${BASE_URL}`);

  const healthy = await checkHealth();
  const metadata = await fetchMetadata();

  if (!healthy && !metadata) {
    err("server unreachable — aborting (health and metadata both failed).");
    process.exitCode = 1;
    return;
  }

  const cdpKey = process.env.CDP_API_KEY;
  if (!cdpKey) {
    log("\n[warning] CDP_API_KEY not set — skipping Bazaar registration");
    log("(exiting 0 so CI does not break; set CDP_API_KEY to enable registration)");
    if (process.env.AWS_REGION) {
      log("[aws] AWS_REGION set but ignored — Bedrock AgentCore registration is manual (AWS CLI/console).");
    }
    log("\n=== done (0) ===");
    return;
  }

  const result = await registerBazaar(buildBazaarPayload());

  if (process.env.AWS_REGION) {
    log("[aws] AWS_REGION set but ignored — Bedrock AgentCore registration is manual (AWS CLI/console).");
  }

  if (result.posted) {
    log("\n=== done (0): bazaar registration accepted ===");
  } else {
    log(`\n=== done (${result.posted ? 0 : 1}): bazaar registration ${result.posted ? "accepted" : "not posted/failed"} ===`);
    process.exitCode = result.posted ? 0 : 1;
  }
}

if (typeof fetch !== "function") {
  err("global fetch is unavailable — this script requires Node 18+.");
  process.exitCode = 1;
} else {
  main().catch((e) => {
    err(`unexpected error: ${e.message}`);
    process.exitCode = 1;
  });
}