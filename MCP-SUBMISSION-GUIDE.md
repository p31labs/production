# MCP Server Submission Guide

**Generated:** 2026-08-18  
**Payloads verified:** 8/8 (all valid)

---

## Server Inventory

| # | Server | Description | Tools | Endpoint |
|---|--------|-------------|-------|----------|
| 1 | **p31-spaceship-earth** | Dome geometry, system health, DUNA readiness, PQC ops (Ed25519, ML-DSA-65, ML-KEM-768), EUDI Wallet VC 2.1, session mgmt, semantic search, mesh networking | 16 | `https://spaceship-relay.trimtab-signal.workers.dev/mcp` |
| 2 | **p31-crypto-mcp** | Post-quantum crypto — ML-DSA-65 (FIPS 204), ML-KEM-768 (FIPS 203), SD-JWT (RFC 9901), GNU Taler, x402 micropayments, PQC audit | 12 | `https://p31-crypto-mcp.trimtab-signal.workers.dev/mcp` |
| 3 | **p31-design-mcp** | DTCG token resolution, component schemas, usage audit, layout generation, validation, auto-fix for the P31 quantum design system | 8 | stdio: `node cli/design-mcp-server.js` |

**Total tools across all 3 servers: 36**

---

## 1. Glama Submission

**URL:** https://glama.ai/mcp/servers/new

Submit each server individually. The JSON payloads are ready to paste.

### Fields to fill per submission

| Field | Source |
|-------|--------|
| **Name** | `name` from glama payload |
| **Description** | `description` from glama payload |
| **Endpoint / Command** | `endpoint` from glama payload |
| **Transport** | `transport` from glama payload |
| **Repository** | `repository` from glama payload |
| **Homepage** | `homepage` from glama payload |
| **Keywords** | `keywords` array from glama payload |
| **Authentication** | `authentication` from glama payload |
| **Tools** | Paste the `tools` array — name + description for each |

### Payload files

| Server | Glama Payload |
|--------|---------------|
| Spaceship Earth | `/home/p31/P31-local-workspace/glama-submission-payload.json` |
| Crypto MCP | `/home/p31/P31-local-workspace/workers/p31-crypto-mcp/glama-submission-payload.json` |
| Design MCP | `/home/p31/P31-local-workspace/cli/design-mcp-server/glama-submission-payload.json` |

### Submission notes

- Spaceship Earth and Crypto MCP are **streamable-http** — enter the full endpoint URL.
- Design MCP is **stdio** — the endpoint field is `stdio: node cli/design-mcp-server.js`. Glama may ask for a command separately; use `node` as command, `cli/design-mcp-server.js` as args.
- All three are **public / no auth**.

---

## 2. Official Registry Submission

**URL:** https://github.com/anthropics/official-registry/blob/main/README.md  
**PR target:** Fork → `servers/` directory → open PR to `anthropics/official-registry`

### PR format

1. Fork `anthropics/official-registry` to `p31labs`
2. Create a new branch: `add-p31-<server-name>`
3. Add a JSON file under `servers/` named `<server-name>.json` containing the official-registry-entry payload
4. Open a PR with title: `Add p31-<server-name> MCP server`

### Official registry entry requirements

| Field | Requirement |
|-------|-------------|
| `name` | Unique, kebab-case |
| `description` | Concise, includes tool count |
| `url` | MCP endpoint (http) or `stdio` |
| `transport` | Object: `{ "type": "streamable-http" }` or `{ "type": "stdio", "command": [...] }` |
| `repository` | Object: `{ "url": "...", "source": "github" }` |
| `homepage` | Project homepage |
| `keywords` | Array of strings |
| `authentication` | Object: `{ "type": "none" }` |
| `tools` | Array of `{ name, description }` |

### Payload files

| Server | Official Registry Payload |
|--------|--------------------------|
| Spaceship Earth | `/home/p31/P31-local-workspace/official-registry-entry.json` |
| Crypto MCP | `/home/p31/P31-local-workspace/workers/p31-crypto-mcp/official-registry-entry.json` |
| Design MCP | `/home/p31/P31-local-workspace/cli/design-mcp-server/official-registry-entry.json` |

---

## 3. Smithery Auto-Detection Verification

Smithery auto-detects MCP servers from `smithery.yaml` in the repo root or server directories. Two of the three servers have smithery.yaml files (Design MCP is stdio-only and may not be supported by Smithery's auto-detection).

### Verification steps

1. Navigate to https://smithery.ai and search for each server name
2. For **p31-spaceship-earth** and **p31-crypto-mcp**, Smithery should auto-detect from the `smithery.yaml`
3. If not detected, manually submit at https://smithery.ai/submit using the smithery.yaml content

### Smithery files

| Server | Smithery File | Status |
|--------|---------------|--------|
| Spaceship Earth | `/home/p31/P31-local-workspace/packages/spaceship-earth/smithery.yaml` | Present |
| Crypto MCP | `/home/p31/P31-local-workspace/workers/p31-crypto-mcp/smithery.yaml` | Present |
| Design MCP | N/A (stdio-only) | Not applicable |

### Smithery.yaml field mapping

Both existing smithery.yaml files use:
- `transport.type: http` with full URL
- `protocol: 2026-07-28` (MCP spec version)
- `tools` as a flat name list
- `tags` for discoverability

---

## 4. HuggingFace Dataset Upload

**Dataset URL:** https://huggingface.co/datasets/modelcontextprotocol/servers

### Upload instructions

1. Clone or fork `modelcontextprotocol/servers` from HuggingFace
2. For each server, add an entry to the dataset (typically a JSON/JSONL row per server):
   - `name`: server name
   - `description`: server description
   - `url`: MCP endpoint
   - `transport`: streamable-http or stdio
   - `repository`: GitHub URL
   - `tools_count`: number of tools (16, 12, or 8)
   - `keywords`: comma-separated tags
3. Submit via HuggingFace PR or dataset update

### Entries to add

| Server | Tools | Transport |
|--------|-------|-----------|
| p31-spaceship-earth | 16 | streamable-http |
| p31-crypto-mcp | 12 | streamable-http |
| p31-design-mcp | 8 | stdio |

---

## 5. Submission Checklist

### Spaceship Earth (p31-spaceship-earth) — 16 tools

- [ ] Glama submission (https://glama.ai/mcp/servers/new)
- [ ] Official Registry PR (https://github.com/anthropics/official-registry)
- [ ] Smithery auto-detection verification
- [ ] HuggingFace dataset entry

### Crypto MCP (p31-crypto-mcp) — 12 tools

- [ ] Glama submission (https://glama.ai/mcp/servers/new)
- [ ] Official Registry PR (https://github.com/anthropics/official-registry)
- [ ] Smithery auto-detection verification
- [ ] HuggingFace dataset entry

### Design MCP (p31-design-mcp) — 8 tools

- [ ] Glama submission (https://glama.ai/mcp/servers/new)
- [ ] Official Registry PR (https://github.com/anthropics/official-registry)
- [ ] HuggingFace dataset entry

### Global

- [ ] All 6 Glama submissions complete (2 registry × 3 servers)
- [ ] All 3 Official Registry PRs merged
- [ ] Smithery auto-detection confirmed (2 HTTP servers)
- [ ] HuggingFace dataset updated (3 entries)

---

## Payload Validation Summary

| File | Format | Valid | Tools |
|------|--------|-------|-------|
| `glama-submission-payload.json` (spaceship-earth) | JSON | ✅ | 16 |
| `official-registry-entry.json` (spaceship-earth) | JSON | ✅ | 16 |
| `glama-submission-payload.json` (crypto-mcp) | JSON | ✅ | 12 |
| `official-registry-entry.json` (crypto-mcp) | JSON | ✅ | 12 |
| `glama-submission-payload.json` (design-mcp) | JSON | ✅ | 8 |
| `official-registry-entry.json` (design-mcp) | JSON | ✅ | 8 |
| `smithery.yaml` (spaceship-earth) | YAML | ✅ | 16 |
| `smithery.yaml` (crypto-mcp) | YAML | ✅ | 12 |
