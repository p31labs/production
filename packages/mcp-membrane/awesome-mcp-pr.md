### PR for awesome-mcp-servers (punkpeye repo)

Fork: https://github.com/p31labs/awesome-mcp-servers (or submit directly)

File to edit: `README.md`

Add under appropriate category (e.g., "Developer Tools" or "DevOps"):

```markdown
### [P31 Membrane](https://github.com/p31labs/mcp-membrane)
Post-deploy verification MCP server — DORA metrics, deploy checks, gamified XP/LOVE rewards, and artifact minting. The only MCP server that combines operational metrics with real-time gamification.

- **Tools:** membrane_status, membrane_dora, membrane_history, membrane_deploy_check, membrane_dora_scorecard, membrane_artifact_mint
- **Install:** `npx -y @p31ca/mcp-membrane`
- **Keywords:** dora, devops, verification, gamification, deploy, mcp
```

### PR for awesome-mcp-servers (appcypher repo)

Same content, same category.

### Smithery configuration

```json
{
  "name": "p31-mcp-membrane",
  "displayName": "P31 Membrane",
  "description": "Post-deploy verification with DORA metrics and gamification",
  "runtime": "node",
  "command": "npx",
  "args": ["-y", "@p31ca/mcp-membrane"],
  "env": {},
  "tools": [
    "membrane_status",
    "membrane_dora",
    "membrane_history",
    "membrane_deploy_check",
    "membrane_dora_scorecard",
    "membrane_artifact_mint"
  ]
}
```

### MCP.so submission

1. Go to https://mcp.so/submit
2. Select "MCP Server"
3. Fill:
   - GitHub URL: `https://github.com/p31labs/mcp-membrane`
   - Description: `Post-deploy verification MCP server — DORA metrics, deploy checks, gamified XP/LOVE rewards, and artifact minting`
   - Tags: `mcp, devops, dora, verification, gamification, deploy`
   - Category: `Developer Tools`
4. Submit
