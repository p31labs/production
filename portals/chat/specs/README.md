# Component Contracts

Machine-readable, enforceable contracts for P31 chat sandbox components. Agents read these before writing code; CI validates against them.

## Structure

```
specs/<component>/
├── tokens.json   # closed token list + ARIA + states + spoon rules
```

## Contract Schema

| Field | Required | Description |
|---|---|---|
| `component` | ✅ | PascalCase component name |
| `system` | ✅ | Package path where component lives |
| `semantic_parts` | ✅ | Named regions a token can target |
| `token_contract` | ✅ | Closed lists of allowed tokens by category |
| `required_aria` | ✅ | ARIA rules keyed by state |
| `interaction_states` | ✅ | Enum of all states the component supports |
| `spoon_contract` | ✅ | Spoon-aware rules (touch targets, motion, glass limits) |
| `forbidden_patterns` | ✅ | Patterns that must never appear in generated code |
| `ownership` | optional | Chat-specific: user vs assistant layout rules |

## Usage

```bash
pnpm contracts:emit    # write src/generated/contracts/*.json
pnpm contracts:validate # lint contracts for completeness
```

## MCP Surface

| Tool | Purpose |
|---|---|
| `list_components` | Enumerate components with contracts |
| `get_contract` | Fetch contract for a specific component |
| `validate_contract` | Check generated code against contract |
| `clarify` | Detect ambiguities before synthesis |

## Rubric

Priority-ranked checks for visual repair:

| Priority | Type | Example |
|---|---|---|
| 1 (Critical) | Brand identity | Accent uses `--p31-accent`, not raw color |
| 1 (Critical) | Glass hierarchy | Glass only on transient/elevated layers |
| 1 (Critical) | Spoon awareness | Every interactive element declares `data-spoons` |
| 2 (High) | Typography | Plus Jakarta Sans, not system-ui |
| 2 (High) | Spacing | 4/8 scale, not arbitrary px |
| 2 (High) | Color invariants | No pure white text, no pure black backgrounds |
| 3 (Medium) | Layout ownership | User right-aligned, assistant full-width |
