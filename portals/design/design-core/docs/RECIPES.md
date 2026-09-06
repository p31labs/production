# Recipes (class library)

Cascade order pinned by `src/recipes/index.css`. Deployed bundle concatenates:
color-palette → typography-scale → legacy sheet → forms → responsive → spoon-ladder.

Key classes: `.glass-panel .glass-card .glass-strong .glass-subtle .glass-box` (surfaces tiers) ·
`.topbar .bottom-nav .sidebar .side-nav .skip-link` (chrome) ·
`.btn .btn-primary .btn-secondary .btn-danger .btn-ghost .btn-sm/md/lg` ·
`.input .select .checkbox .radio .field-label .field-error` ·
`.badge .badge-success/warning/error/info` · `.toast-region .toast-*` · `.modal-overlay .modal` ·
`.tooltip .dropdown-menu .dropdown-item` · `.spinner-sm/md/lg` ·
`.tetra-grid .container .grid-2 .grid-3` · `.breath-circle` (crisis).

SVG text rule: when drawing SVG labels, always set `dominant-baseline="central"` to avoid macOS 4–6px drift.
Legacy sheet section map lives in git history; MCP recipe metadata derives from it.
