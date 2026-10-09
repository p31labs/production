/**
 * @file P31 Component Definitions
 * Source of truth for all P31 design system components.
 *
 * These definitions drive:
 *   - Multi-framework generation (React, Astro, HTML, Web Components)
 *   - MCP server tooling
 *   - Design system documentation
 *   - AI agent guidance
 */

export interface ComponentDef {
  description: string;
  css_class: string;
  category: ComponentCategory;
  tokens: string[];
  aiGuidance: {
    useWhen: string[];
    avoidWhen: string[];
    examples: string[];
  };
  props?: Record<string, { type: string; required?: boolean; default?: any; description: string; min?: number; max?: number }>;
  slots?: string[];
  variants?: string[];
  accessibility?: string[];
  status?: 'stable' | 'beta' | 'deprecated';
  version?: string;
  importPath?: string;
}

export const COMPONENT_CATEGORIES = [
  'surface',
  'navigation',
  'action',
  'feedback',
  'accessibility',
  'ambient',
  'chrome',
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

export const COMPONENT_DEFS: Record<string, ComponentDef> = {
  GlassPanel: {
    description: 'Elevated glassmorphic surface with backdrop blur. Use for modals, drawers, and elevated content areas.',
    css_class: 'glass-panel',
    category: 'surface',
    tokens: ['glass.bg', 'glass.blur', 'glass.border', 'glass.radius', 'glass.shadow'],
    aiGuidance: {
      useWhen: ['Elevated content above other UI', 'Modal/dialog backgrounds', 'Dropdown menus'],
      avoidWhen: ['Inline content within a flow', 'Background surfaces'],
      examples: ['<div class="glass-panel">...</div>', '<GlassPanel padding="lg">...</GlassPanel>'],
    },
    props: {
      children: { type: 'ReactNode', description: 'Content to render inside the panel' },
      padding: { type: '"sm" | "md" | "lg"', default: 'md', description: 'Padding size' },
      className: { type: 'string', description: 'Additional CSS classes' },
    },
    slots: ['default'],
    variants: ['default', 'hover'],
    accessibility: ['Uses semantic glass tokens for contrast', 'Focus styles inherit from global :focus-visible'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  GlassCard: {
    description: 'Padded glassmorphic card for content grouping. Use for feature cards, paper listings, and content tiles.',
    css_class: 'glass-card',
    category: 'surface',
    tokens: ['glass.bg', 'glass.blur', 'glass.border', 'glass.radius', 'spacing.lg'],
    aiGuidance: {
      useWhen: ['Content grouping in grids', 'Feature cards', 'Paper/research listings', 'Dashboard tiles'],
      avoidWhen: ['Navigation elements', 'Form inputs', 'Full-width backgrounds'],
      examples: ['<div class="glass-card">...</div>', '<GlassCard strong>...</GlassCard>'],
    },
    props: {
      children: { type: 'ReactNode', description: 'Card content' },
      strong: { type: 'boolean', default: false, description: 'Use stronger glass opacity' },
      className: { type: 'string', description: 'Additional CSS classes' },
    },
    slots: ['default'],
    variants: ['default', 'strong'],
    accessibility: ['Minimum padding ensures touch target compliance'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Topbar: {
    description: 'Unified app-chrome shell — slot-based three-region layout. Brand / center / statusCluster / mode / trailing / identity, with variant (app|marketing|game) and mobile overrides. The identity slot is auth-agnostic (SignInLink / IdentityChip / AccountMenu fills).',
    css_class: 'topbar',
    category: 'chrome',
    tokens: ['topbar.height', 'glass.bg', 'glass.blur', 'glass.border', 'spacing.sm', 'radius.candy', 'accent', 'accent-gold', 'accent-green'],
    aiGuidance: {
      useWhen: ['Authenticated app chrome', 'Site-wide navigation', 'Brand header', 'Persistent status (spoons/mode)'],
      avoidWhen: ['Inline headers within content', 'Modal headers'],
      examples: ['<Topbar brand={<Crown/>} center={<CommandTrigger/>} statusCluster={<StatusCluster><SpoonCluster level={3}/></StatusCluster>} mode={<ModePill mode="spark"/>} trailing={<Avatar/>}/>'],
    },
    props: {
      brand: { type: 'ReactNode', description: 'Left cluster: app mark + wordmark' },
      left: { type: 'ReactNode', description: 'Legacy alias for brand' },
      center: { type: 'ReactNode', description: 'Center region: command trigger, nav, or context' },
      right: { type: 'ReactNode', description: 'Legacy right cluster (renders into trailing)' },
      statusCluster: { type: 'ReactNode', description: 'Read-only status segments' },
      mode: { type: 'ReactNode', description: 'Primary mode control (ModePill)' },
      trailing: { type: 'ReactNode', description: 'Pinned trailing actions (utility cluster)' },
      identity: { type: 'ReactNode', description: 'Identity region — fenced from trailing; SignInLink / IdentityChip / AccountMenu fill' },
      mobileLeading: { type: 'ReactNode', description: 'Mobile-only leading override' },
      mobileTrailing: { type: 'ReactNode', description: 'Mobile-only trailing override' },
      variant: { type: "'app' | 'marketing' | 'game'", default: 'app', description: 'Visual variant' },
      sticky: { type: 'boolean', default: true, description: 'Sticky at top' },
    },
    slots: ['brand', 'center', 'status', 'mode', 'trailing', 'identity'],
    variants: ['app', 'marketing', 'game'],
    accessibility: ['role=banner', 'aria-label on header', 'Center collapses on mobile with mobileLeading/Trailing'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  BottomNav: {
    description: 'Fixed bottom navigation bar for mobile-first apps. Use for primary app navigation.',
    css_class: 'bottom-nav',
    category: 'chrome',
    tokens: ['topbar.height', 'glass.bg', 'glass.blur', 'glass.border', 'spacing.sm'],
    aiGuidance: {
      useWhen: ['Mobile app navigation', 'Primary navigation on small screens', 'Tab-based navigation'],
      avoidWhen: ['Desktop-only navigation', 'Secondary navigation', 'More than 5 items'],
      examples: ['<nav class="bottom-nav">...</nav>', '<BottomNav items={navItems} />'],
    },
    props: {
      items: { type: 'NavItem[]', description: 'Navigation items with icon, label, and href' },
      activeIndex: { type: 'number', description: 'Currently active item index' },
    },
    slots: ['default'],
    variants: ['default', 'mobile', 'tablet'],
    accessibility: ['Minimum 48px touch targets', 'Active state clearly indicated', 'aria-selected on active item'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  SpoonDial: {
    description: 'Cognitive load selector (0-5 spoons). Use for neurodivergent-first accessibility control.',
    css_class: 'spoon-dial',
    category: 'chrome',
    tokens: ['radius.full', 'glass.bg', 'glass.border', 'accent', 'text.tertiary'],
    aiGuidance: {
      useWhen: ['Accessibility controls', 'Cognitive load adjustment', 'Neurodivergent-first UX'],
      avoidWhen: ['Primary navigation', 'Form inputs', 'Settings pages without context'],
      examples: ['<div class="spoon-dial">...</div>', '<SpoonDial level={3} onChange={setSpoons} />'],
    },
    props: {
      level: { type: 'number', min: 0, max: 5, description: 'Current spoon level (0-5)' },
      onChange: { type: '(level: number) => void', description: 'Callback when level changes' },
    },
    slots: ['default'],
    variants: ['default', 'crisis'],
    accessibility: ['Role: radiogroup', 'aria-checked on each button', 'Labels for each level'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Button: {
    description: 'Primary action button. Use for CTAs, form submissions, and key actions.',
    css_class: 'btn',
    category: 'action',
    tokens: ['accent', 'radius.md', 'spacing.sm', 'spacing.lg', 'font.weight'],
    aiGuidance: {
      useWhen: ['Primary CTAs', 'Form submissions', 'Key actions requiring emphasis'],
      avoidWhen: ['Secondary actions', 'Destructive actions without confirmation', 'Inline links'],
      examples: ['<button class="btn btn-primary">...</button>', '<Button variant="primary">...</Button>'],
    },
    props: {
      children: { type: 'ReactNode', description: 'Button content' },
      variant: { type: '"primary" | "secondary" | "ghost"', default: 'primary', description: 'Visual variant' },
      disabled: { type: 'boolean', default: false, description: 'Disabled state' },
      onClick: { type: '() => void', description: 'Click handler' },
    },
    slots: ['default'],
    variants: ['primary', 'secondary', 'ghost'],
    accessibility: ['Minimum 48px height', 'Disabled state clearly indicated', 'Focus ring visible'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  StatusBadge: {
    description: 'Status indicator badge. Use for system status, health indicators, and state labels.',
    css_class: 'badge',
    category: 'feedback',
    tokens: ['radius.full', 'scale.xs', 'accent.green', 'accent.red', 'accent.gold'],
    aiGuidance: {
      useWhen: ['System health indicators', 'Feature flags', 'Beta/alpha labels', 'Connection status'],
      avoidWhen: ['Primary content', 'Long text', 'Interactive elements'],
      examples: ['<span class="badge badge-success">Live</span>', '<StatusBadge status="online" />'],
    },
    props: {
      status: { type: '"online" | "offline" | "busy" | "away"', description: 'Status type' },
      label: { type: 'string', description: 'Badge text' },
    },
    slots: ['default'],
    variants: ['success', 'warning', 'error', 'info'],
    accessibility: ['Color + icon for colorblind users', 'Screen reader text included'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  MetricBadge: {
    description: 'Compact metric display with icon. Use for dashboard KPIs and telemetry.',
    css_class: 'metric-badge',
    category: 'feedback',
    tokens: ['glass.bg', 'glass.border', 'radius.sm', 'scale.xs', 'text.secondary'],
    aiGuidance: {
      useWhen: ['Dashboard KPIs', 'Telemetry displays', 'Compact metrics in navbars'],
      avoidWhen: ['Primary content', 'Long values', 'Interactive controls'],
      examples: ['<div class="metric-badge"><span class="status-dot"></span> Online</div>'],
    },
    props: {
      icon: { type: 'ReactNode', description: 'Icon or indicator' },
      value: { type: 'string | number', description: 'Metric value' },
      label: { type: 'string', description: 'Metric label' },
      clickable: { type: 'boolean', default: false, description: 'Enable hover state' },
    },
    slots: ['default'],
    variants: ['default', 'clickable'],
    accessibility: ['Icon has aria-hidden or accessible name', 'Value is screen-reader accessible'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Starfield: {
    description: 'Animated starfield background. Use for ambient backgrounds in shell and marketing.',
    css_class: 'starfield-bg',
    category: 'ambient',
    tokens: ['z.starfield', 'starfield.hearth', 'starfield.teal', 'starfield.remembrance'],
    aiGuidance: {
      useWhen: ['Page backgrounds', 'Ambient effects', 'Shell backgrounds'],
      avoidWhen: ['Content areas', 'Overlays on top of text', 'Crisis mode (spoons=0)'],
      examples: ['<div class="starfield-bg" aria-hidden="true"></div>', '<Starfield spoons={3} />'],
    },
    props: {
      spoons: { type: 'number', description: 'Current spoon level for density/speed' },
      warmStars: { type: 'boolean', description: 'Use warm color palette' },
      reduceMotion: { type: 'boolean', description: 'Disable animations' },
    },
    slots: ['default'],
    variants: ['default', 'warm', 'reduced-motion'],
    accessibility: ['aria-hidden="true"', 'Respects prefers-reduced-motion', 'Disabled at spoons=0'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/starfield',
  },

  CrisisOverlay: {
    description: 'Full-screen crisis mode overlay. Shown when spoons=0. Only exit control visible.',
    css_class: 'crisis-overlay',
    category: 'chrome',
    tokens: ['bg', 'text', 'accent', 'z.crisis'],
    aiGuidance: {
      useWhen: ['Cognitive overload protection', 'Spoons=0 state', 'Emergency break glass'],
      avoidWhen: ['Normal operation', 'Informational overlays', 'Non-critical warnings'],
      examples: ['<div class="crisis-overlay" data-spoons="0">...</div>', '<CrisisOverlay onReady={exitCrisis} />'],
    },
    props: {
      onReady: { type: '() => void', description: 'Callback when user dismisses overlay' },
      message: { type: 'string', description: 'Custom crisis message' },
    },
    slots: ['default'],
    variants: ['default'],
    accessibility: ['Full screen focus trap', 'Escape key exits', 'High contrast text'],
    status: 'stable',
    version: '1.0.0',
    importPath: '@p31ca/design-core/crisis-overlay',
  },

  SectionStrip: {
    description: 'Desktop pill navigation strip. Use for primary section navigation on wide viewports.',
    css_class: 'section-strip',
    category: 'chrome',
    tokens: ['glass.bg', 'glass.border', 'radius.candy', 'accent', 'text.secondary'],
    aiGuidance: {
      useWhen: ['Desktop primary navigation', 'Section switching', 'Router-agnostic nav'],
      avoidWhen: ['Mobile navigation (use BottomNav)', 'More than 7 items', 'Modal contexts'],
      examples: ['<SectionStrip items={sections} onSelect={navigate} />'],
    },
    props: {
      items: { type: 'SectionItem[]', description: 'Nav items: { id, label, icon?, active? }' },
      onSelect: { type: '(id: string) => void', description: 'Called with the selected section id' },
      className: { type: 'string', description: 'Additional CSS classes' },
      style: { type: 'CSSProperties', description: 'Inline styles' },
    },
    slots: ['default'],
    variants: ['default'],
    accessibility: ['aria-current="page" on active tab', 'Minimum 48px targets', 'Keyboard navigable buttons'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  CommandPalette: {
    description: 'Keyboard-friendly command palette (⌘K). Use for site-wide search and command invocation.',
    css_class: 'cmdk',
    category: 'chrome',
    tokens: ['glass.bg', 'glass.border', 'glass.blur', 'accent', 'radius.md', 'z.modal'],
    aiGuidance: {
      useWhen: ['Site-wide search', 'Command invocation', 'Keyboard-first power users'],
      avoidWhen: ['Inline search within forms', 'Primary navigation', 'Mobile-first (native) flows'],
      examples: ['<CommandPalette open={open} onClose={close} items={commands} onSelect={run} />'],
    },
    props: {
      open: { type: 'boolean', required: true, description: 'Controlled open state' },
      onClose: { type: '() => void', required: true, description: 'Close callback' },
      items: { type: 'CommandItem[]', required: true, description: 'Searchable items: { id, label, description?, icon?, keywords? }' },
      onSelect: { type: '(id: string) => void', required: true, description: 'Called with the selected item id' },
      placeholder: { type: 'string', default: 'Search…', description: 'Input placeholder' },
      leadingIcon: { type: 'ReactNode', description: 'Optional leading icon' },
    },
    slots: ['default'],
    variants: ['default'],
    accessibility: ['role=dialog + aria-modal', 'role=listbox / option', 'ArrowUp/Down + Enter + Escape keys', 'Arrow keys cycle results'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Chameleon: {
    description: 'Adaptive theme controls: brand × world × age × sensory modes. Zero-reload token swaps.',
    css_class: 'chameleon',
    category: 'ambient',
    tokens: ['theme.*', 'brand.*', 'accent', 'sensory.muted', 'sensory.warmLight'],
    aiGuidance: {
      useWhen: ['Theme switching', 'Brand switching', 'Accessibility (muted/dusk) controls'],
      avoidWhen: ['Inline content panels', 'Nested dialog contexts', 'Restricted UI shells'],
      examples: ['<Chameleon />', '<Chameleon className="topbar-right" />'],
    },
    props: {
      className: { type: 'string', description: 'Additional CSS classes' },
      style: { type: 'CSSProperties', description: 'Inline styles' },
    },
    slots: ['default'],
    variants: ['default'],
    accessibility: ['aria-haspopup=dialog', 'aria-expanded', 'aria-pressed on chips', 'Escape closes panel'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  PageHeader: {
    description: 'Inner-page hero: mono eyebrow, gradient title, and lede. Use at the top of content routes.',
    css_class: 'page-header-route',
    category: 'surface',
    tokens: ['title.gradient', 'text.secondary', 'spacing.lg'],
    aiGuidance: {
      useWhen: ['Route/page headers', 'Content hero sections', 'Documentation pages'],
      avoidWhen: ['Topbar/brand headers', 'Modal headers', 'List item headers'],
      examples: ['<PageHeader eyebrow="System" title="Tokens" lede="..." />'],
    },
    props: {
      eyebrow: { type: 'string', required: true, description: 'Mono eyebrow label' },
      title: { type: 'string', required: true, description: 'Page title' },
      lede: { type: 'string', description: 'Supporting lede paragraph' },
      children: { type: 'ReactNode', description: 'Optional action cluster (rendered in .page-actions)' },
      className: { type: 'string', description: 'Additional CSS classes' },
      style: { type: 'CSSProperties', description: 'Inline styles' },
    },
    slots: ['default'],
    variants: ['default', 'actions'],
    accessibility: ['Semantic <header> + <h1>', 'Visual gradient paired with text', 'Actions are keyboard reachable'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Footer: {
    description: 'Site footer with configurable columns, branding, and legal text.',
    css_class: 'site-footer',
    category: 'chrome',
    tokens: ['surface.bg', 'text.primary', 'text.secondary', 'border.subtle', 'spacing.lg'],
    aiGuidance: {
      useWhen: ['Page footers', 'Site-wide navigation', 'Legal/copyright notices'],
      avoidWhen: ['Inline content areas', 'Modal footers', 'Inline content separators'],
      examples: ['<Footer columns={systemColumns} />'],
    },
    props: {
      columns: { type: 'FooterColumn[]', description: 'Footer column groups with title and links' },
      brandLabel: { type: 'string', default: 'P31', description: 'Brand label text' },
      brandIcon: { type: 'ReactNode', description: 'Optional brand icon' },
      tagline: { type: 'string', default: 'Sovereign, neuroinclusive interface foundation.', description: 'Tagline text' },
      copyright: { type: 'string', description: 'Optional copyright year/owner' },
      legalText: { type: 'string', default: 'MIT · built on DTCG tokens', description: 'Legal/license text' },
      className: { type: 'string', description: 'Additional CSS classes' },
      style: { type: 'CSSProperties', description: 'Inline styles' },
    },
    slots: ['default'],
    variants: ['default'],
    accessibility: ['Semantic <footer> element', 'ARIA labels on navigation sections', 'Link text is descriptive'],
status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  SidebarNav: {
    description: 'Flat suite navigation rail (emoji + label), active state per route. Store-agnostic — items/activePath/onNavigate are props.',
    css_class: 'sidebar-nav',
    category: 'chrome',
    tokens: ['glass.surface', 'glass.border', 'accent', 'text.secondary', 'radius.full', 'font.sans'],
    aiGuidance: {
      useWhen: ['Persistent side navigation', 'Flat suite nav (many sections)', 'Route-aware active state'],
      avoidWhen: ['Mobile-only chrome', 'Hierarchical trees needing nesting'],
      examples: ['<SidebarNav items={navSections} activePath={pathname} onNavigate={go} />'],
    },
    props: {
      items: { type: 'SidebarNavItem[]', required: true, description: 'Nav items: { path, label, emoji?, flagship? }' },
      activePath: { type: 'string', description: 'Currently active route path' },
      onNavigate: { type: '(path: string) => void', description: 'Route handler (consumer owns routing)' },
      className: { type: 'string', description: 'Additional CSS classes' },
      ariaLabel: { type: 'string', default: 'Main navigation', description: 'nav aria-label' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['Semantic <nav> element', 'aria-current=page on active item', 'Focus-visible ring on items'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  MobileBottomNav: {
    description: 'Mobile bottom navigation bar — flagship items only (suite pattern). Store-agnostic.',
    css_class: 'mobile-bottom-nav',
    category: 'chrome',
    tokens: ['glass.surface', 'glass.border', 'glass.blur', 'accent', 'text.secondary', 'radius.full'],
    aiGuidance: {
      useWhen: ['Mobile bottom tab bars', 'Flagship item shortcuts', 'Compact nav under 768px'],
      avoidWhen: ['Desktop primary nav', 'Nav with text labels needed'],
      examples: ['<MobileBottomNav items={flagships} activePath={pathname} onNavigate={go} />'],
    },
    props: {
      items: { type: 'SidebarNavItem[]', required: true, description: 'Nav items; flagships shown' },
      activePath: { type: 'string', description: 'Currently active route path' },
      onNavigate: { type: '(path: string) => void', description: 'Route handler (consumer owns routing)' },
      className: { type: 'string', description: 'Additional CSS classes' },
      ariaLabel: { type: 'string', default: 'Mobile navigation', description: 'nav aria-label' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['Semantic <nav> element', 'aria-current=page on active item', 'Touch targets 48px'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  CalmOverlay: {
    description: 'Calm mode — the regulation instrument (CALM-MODE.md). Renders nothing; drives data-calm on <html> to hide chrome and keep the ambient. Store-agnostic — spoons/onExit are props.',
    css_class: 'calm-overlay',
    category: 'chrome',
    tokens: ['void', 'accent', 'text.primary', 'cloud', 'glass.blur', 'z.floating'],
    aiGuidance: {
      useWhen: ['Spoon level 0 / calm floor', 'Chrome-hiding calm mode (ambient stays)', 'LED/haptic-driven breathing guidance'],
      avoidWhen: ['Normal navigation', 'Any non-crisis state'],
      examples: ['<CalmOverlay spoons={spoons} onExit={() => setSpoons(1)} onEnterCalm={applyLedCalmPreset} />'],
    },
    props: {
      spoons: { type: 'number', required: true, description: 'Current spoon level; calm activates at 0' },
      onExit: { type: '() => void', required: true, description: 'Exit handler (Esc / tap LED chip / spoon-restore)' },
      onEnterCalm: { type: '() => void', description: 'Entry hook — consumer applies the LED calm preset + haptic pattern' },
      sighFirst: { type: 'boolean', description: 'Physiological sigh for 60s before coherence (default true)' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['role=dialog aria-modal=true', 'aria-label="Calm mode"', 'Return button is keyboard reachable'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  NotificationStack: {
    description: 'Stacked, severity-tinted notification toasts (bottom-right). Store-agnostic — items/onDismiss are props; colors via data-kind.',
    css_class: 'notif-stack',
    category: 'chrome',
    tokens: ['glass.surface', 'glass.border', 'accent', 'accent-green', 'accent-gold', 'accent-red', 'text.primary', 'text.secondary', 'z.floating'],
    aiGuidance: {
      useWhen: ['Stacked toast notifications', 'Severity-tinted status (info/success/milestone/error)', 'Auto-dismiss queues'],
      avoidWhen: ['Inline alerts', 'Modal-confirmation flows'],
      examples: ['<NotificationStack items={notifs} onDismiss={dismiss} onClearAll={clearAll} />'],
    },
    props: {
      items: { type: 'Notification[]', required: true, description: 'Notifications: { id, kind, title, body? }' },
      onDismiss: { type: '(id: string) => void', description: 'Dismiss one by id' },
      onClearAll: { type: '() => void', description: 'Clear all (optional)' },
      className: { type: 'string', description: 'Additional CSS classes' },
      ariaLabel: { type: 'string', default: 'Notifications', description: 'region aria-label' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['role=region aria-label="Notifications"', 'role=status per toast', 'Dismiss buttons are keyboard reachable'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Badge: {
    description: 'Compact status label. Crisis mode keeps colors but forces opaque surfaces.',
    css_class: 'badge',
    category: 'surface',
    tokens: ['accent', 'accent-green', 'accent-gold', 'accent-red', 'radius.full', 'font.sans'],
    aiGuidance: {
      useWhen: ['Status labels', 'Tone tags (success/warning/error/info/neutral)'],
      avoidWhen: ['Interactive controls', 'Primary call-to-action'],
      examples: ['<Badge tone="success" label="online" />'],
    },
    props: {
      tone: { type: "'success' | 'warning' | 'error' | 'info' | 'neutral'", default: 'neutral', description: 'Status tone' },
      label: { type: 'string', description: 'Label text' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['Small text with sufficient contrast', 'Not interactive'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  CandyHeader: {
    description: 'Candy-rounded glass header for the sovereign stack.',
    css_class: 'candy-header',
    category: 'surface',
    tokens: ['glass.surface', 'glass.border', 'radius.candy', 'text.primary', 'accent'],
    aiGuidance: {
      useWhen: ['Rounded glass section headers', 'Branded page headers'],
      avoidWhen: ['Standard top bars', 'Inline headings'],
      examples: ['<CandyHeader eyebrow="System" title="Candy Header" lede="A candy-rounded glass header" />'],
    },
    props: {
      eyebrow: { type: 'string', description: 'Small kicker text' },
      title: { type: 'string', description: 'Header title' },
      lede: { type: 'string', description: 'Supporting lead text' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['Semantic header', 'Title present'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Card: {
    description: 'Elevated surface with an optional interactive affordance.',
    css_class: 'card',
    category: 'surface',
    tokens: ['surface.bg', 'glass.border', 'text.primary', 'text.secondary', 'radius.md', 'shadow'],
    aiGuidance: {
      useWhen: ['Content tiles', 'Feature cards', 'Interactive rows'],
      avoidWhen: ['Modal containers', 'Primary chrome'],
      examples: ['<Card title="Glass card" description="Elevated surface" interactive />'],
    },
    props: {
      title: { type: 'string', description: 'Card title' },
      description: { type: 'string', description: 'Card description' },
      padding: { type: '"sm" | "md" | "lg"', default: 'md', description: 'Padding size' },
      interactive: { type: 'boolean', default: false, description: 'Show interactive affordance' },
      text: { type: 'string', description: 'Body text' },
    },
    slots: ['default'],
    variants: ['default', 'interactive'],
    accessibility: ['Semantic article/card', 'Interactive state has affordance'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  ChatShell: {
    description: 'Conversational shell with a header, drawer, and chat surface.',
    css_class: 'chat-shell',
    category: 'surface',
    tokens: ['surface.bg', 'glass.border', 'text.primary', 'text.secondary', 'radius.lg'],
    aiGuidance: {
      useWhen: ['Chat interfaces', 'Conversational AI surfaces', 'Message threads'],
      avoidWhen: ['Static content', 'Document readers'],
      examples: ['<ChatShell header={header} drawerOpen={open} onCloseDrawer={close} />'],
    },
    props: {
      header: { type: 'ReactNode', description: 'Shell header' },
      drawerLabel: { type: 'string', description: 'Drawer accessible label' },
      drawerOpen: { type: 'boolean', required: true, description: 'Drawer open state' },
      onCloseDrawer: { type: '() => void', required: true, description: 'Close drawer handler' },
      drawer: { type: 'ReactNode', description: 'Drawer content' },
      height: { type: 'string', description: 'Shell height' },
    },
    slots: ['default', 'drawer'],
    variants: ['default'],
    accessibility: ['Semantic region', 'Drawer focus management'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Checkbox: {
    description: 'Tri-state checkbox (checked / unchecked / indeterminate).',
    css_class: 'checkbox',
    category: 'action',
    tokens: ['accent', 'text.primary', 'text.secondary', 'radius.sm', 'border'],
    aiGuidance: {
      useWhen: ['Form toggles', 'Multi-select lists', 'Indeterminate parent states'],
      avoidWhen: ['Single binary actions that need a switch', 'Non-form UI'],
      examples: ['<Checkbox label="Subscribe to care digests" checked />'],
    },
    props: {
      label: { type: 'string', description: 'Accessible label' },
      checked: { type: 'boolean', description: 'Checked state' },
      indeterminate: { type: 'boolean', description: 'Indeterminate state' },
      disabled: { type: 'boolean', description: 'Disabled' },
      onChange: { type: '(checked: boolean) => void', description: 'Change handler' },
    },
    slots: [],
    variants: ['default', 'indeterminate'],
    accessibility: ['Label associated with input', 'Keyboard reachable', 'Indeterminate announced'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Crown: {
    description: 'Compact brand crown mark with a label.',
    css_class: 'crown',
    category: 'chrome',
    tokens: ['accent', 'text.primary', 'font.sans'],
    aiGuidance: {
      useWhen: ['Brand marks', 'Topbar brand slot', 'Logo identifiers'],
      avoidWhen: ['Standalone decorative marks', 'Icon buttons'],
      examples: ['<Crown label="P31" />'],
    },
    props: {
      label: { type: 'string', default: 'P31', description: 'Brand label' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['Text alternative present', 'Non-interactive'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  Dropdown: {
    description: 'Selectable dropdown menu with options.',
    css_class: 'dropdown',
    category: 'action',
    tokens: ['surface.bg', 'glass.border', 'text.primary', 'text.secondary', 'accent', 'radius.md'],
    aiGuidance: {
      useWhen: ['Form selects', 'Menu pickers', 'Filter controls'],
      avoidWhen: ['Multi-select trees', 'Command palettes'],
      examples: ['<Dropdown label="Action" options={[...]} onChange={fn} />'],
    },
    props: {
      label: { type: 'string', description: 'Field label' },
      value: { type: 'string', description: 'Selected value' },
      options: { type: 'DropdownOption[]', description: 'Options list' },
      onChange: { type: '(value: string) => void', description: 'Selection handler' },
      ariaLabel: { type: 'string', description: 'Accessible label' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['Label associated', 'Keyboard reachable', 'Options announced'],
    status: 'stable',
    version: '2.2.0',
    importPath: '@p31ca/design-core/compositions',
  },

  TopbarSection: {
    description: 'Vertically-centered, gap-consistent slot group inside a Topbar. Owns internal spacing; the Topbar owns arrangement.',
    css_class: 'topbar-section',
    category: 'chrome',
    tokens: ['space.xs', 'glass.bg'],
    aiGuidance: {
      useWhen: ['Building a custom Topbar region', 'Slot content grouping'],
      avoidWhen: ['Standalone layout (use Topbar)', 'Page sections'],
      examples: ['<TopbarSection slot="status"><SpoonCluster level={3}/></TopbarSection>'],
    },
    props: {
      slot: { type: "'leading' | 'brand' | 'center' | 'status' | 'mode' | 'trailing' | 'mobile-trailing'", required: true, description: 'Slot identity' },
      className: { type: 'string', description: 'Additional CSS classes' },
    },
    slots: ['default'],
    variants: ['default'],
    accessibility: ['data-slot attribute for consumer styling'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  CommandTrigger: {
    description: 'Topbar search affordance — a button with a keyboard hint that opens the command palette.',
    css_class: 'command-trigger',
    category: 'chrome',
    tokens: ['glass.bg', 'glass.border', 'radius.full', 'text.secondary', 'font.mono'],
    aiGuidance: {
      useWhen: ['Topbar center slot search', 'Command palette trigger'],
      avoidWhen: ['Actual search input', 'Non-global search'],
      examples: ['<CommandTrigger placeholder="Search or jump to…" shortcut="⌘K" onOpen={openPalette}/>'],
    },
    props: {
      placeholder: { type: 'string', default: 'Search or jump to…', description: 'Placeholder text' },
      shortcut: { type: 'string', default: '⌘K', description: 'OS-correct modifier hint' },
      onOpen: { type: '() => void', description: 'Open the command palette' },
      compact: { type: 'boolean', description: 'Icon-only for narrow bars' },
    },
    slots: [],
    variants: ['default', 'compact'],
    accessibility: ['Rendered as a button', 'aria-label = placeholder', 'Keyboard hint is visual only'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  StatusCluster: {
    description: 'Read-only status row in the topbar right region. Scrolls horizontally with edge fades when it outgrows the bar.',
    css_class: 'status-cluster',
    category: 'chrome',
    tokens: ['glass.bg', 'space.xs'],
    aiGuidance: {
      useWhen: ['Multiple status pills (mode, spoons, calm, chips)', 'Overflowing status segments'],
      avoidWhen: ['Interactive action buttons (those pin in trailing)', 'Fewer than 2 status segments'],
      examples: ['<StatusCluster><ModePill mode="spark"/><SpoonCluster level={3}/><CalmIndicator spoons={3}/></StatusCluster>'],
    },
    props: {
      className: { type: 'string', description: 'Additional CSS classes' },
    },
    slots: ['default'],
    variants: ['default'],
    accessibility: ['Hidden scrollbar', 'Edge fades only on overflowing side', 'Children must not open in-flow absolute panels'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  ModePill: {
    description: 'Primary mode control (SPARK / MAKER / WORKSHOP) with a tone dot.',
    css_class: 'mode-pill',
    category: 'chrome',
    tokens: ['accent', 'accent-gold', 'accent-green', 'glass.bg', 'radius.full'],
    aiGuidance: {
      useWhen: ['Mode indicator (spark/maker/workshop)', 'Primary state control'],
      avoidWhen: ['Read-only status (use a plain chip)', 'Non-mode toggles'],
      examples: ['<ModePill mode="spark" onCycle={cycleMode}/>'],
    },
    props: {
      mode: { type: "'spark' | 'maker' | 'workshop'", required: true, description: 'Current mode' },
      onCycle: { type: '() => void', description: 'Cycle or open a picker' },
    },
    slots: [],
    variants: ['spark', 'maker', 'workshop'],
    accessibility: ['aria-label includes current mode', 'Keyboard reachable'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  CalmIndicator: {
    description: 'Calm pill in the status cluster — reads spoon level and opens the calm overlay.',
    css_class: 'calm-indicator',
    category: 'chrome',
    tokens: ['accent-green', 'accent-red', 'glass.bg', 'radius.full'],
    aiGuidance: {
      useWhen: ['Spoon-level status in the topbar', 'Calm overlay affordance'],
      avoidWhen: ['Full calm overlay (use CalmOverlay)', 'Non-calm status'],
      examples: ['<CalmIndicator spoons={2} onOpen={openCalm}/>'],
    },
    props: {
      spoons: { type: 'number', required: true, description: 'Current spoon level (0–5)' },
      onOpen: { type: '() => void', description: 'Open calm overlay' },
    },
    slots: [],
    variants: ['is-calm', 'is-alert'],
    accessibility: ['aria-label reflects calm state', 'Keyboard reachable'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },

  SpoonCluster: {
    description: 'Spoon dots in the status cluster — read-only metabolic status.',
    css_class: 'spoon-cluster',
    category: 'chrome',
    tokens: ['accent', 'glass.border', 'radius.full'],
    aiGuidance: {
      useWhen: ['Spoon-level visual in the topbar', 'Metabolic status'],
      avoidWhen: ['Interactive spoon control', 'Non-status indicator'],
      examples: ['<SpoonCluster level={3} total={5}/>'],
    },
    props: {
      level: { type: 'number', required: true, description: 'Current spoon level (0–5)' },
      total: { type: 'number', default: 5, description: 'Total dots' },
    },
    slots: [],
    variants: ['default'],
    accessibility: ['role=img with aria-label "N of 5 spoons remaining"'],
    status: 'stable',
    version: '3.0.0',
    importPath: '@p31ca/design-core/compositions',
  },
};

export function getComponentDef(name: string): ComponentDef | undefined {
  return COMPONENT_DEFS[name];
}

export function listComponents(): string[] {
  return Object.keys(COMPONENT_DEFS);
}

export function listComponentsByCategory(category: ComponentCategory): string[] {
  return Object.entries(COMPONENT_DEFS)
    .filter(([_, def]) => def.category === category)
    .map(([name]) => name);
}
