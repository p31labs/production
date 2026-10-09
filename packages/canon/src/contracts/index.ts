/**
 * @p31ca/canon — contracts/index.ts
 *
 * The contract surface. Consumers (including the MCP server) import
 * contracts from here, not from individual files.
 */
export { ComponentContractSchema } from './schema.js';
export type {
  ComponentContract,
  Prop,
  AriaRequirement,
  SemanticPart,
  InteractionState,
  SourcePointer,
} from './schema.js';

export { buttonContract } from './button.contract.js';
export { badgeContract } from './badge.contract.js';
export { glassPanelContract } from './glass-panel.contract.js';
export { topbarContract } from './topbar.contract.js';
export { sidebarNavContract } from './sidebar-nav.contract.js';
export { bottomNavContract } from './bottom-nav.contract.js';
export { footerContract } from './footer.contract.js';
export { pageHeaderContract } from './page-header.contract.js';
export { sectionStripContract } from './section-strip.contract.js';
export { statusBadgeContract } from './status-badge.contract.js';
export { statusClusterContract } from './status-cluster.contract.js';
export { metricBadgeContract } from './metric-badge.contract.js';
export { notificationStackContract } from './notification-stack.contract.js';
export { calmIndicatorContract } from './calm-indicator.contract.js';
export { calmOverlayContract } from './calm-overlay.contract.js';
export { crisisOverlayContract } from './crisis-overlay.contract.js';
export { starfieldContract } from './starfield.contract.js';
export { mobileBottomNavContract } from './mobile-bottom-nav.contract.js';
export { topbarSectionContract } from './topbar-section.contract.js';
export { spoonClusterContract } from './spoon-cluster.contract.js';
export { commandTriggerContract } from './command-trigger.contract.js';
export { checkboxContract } from './checkbox.contract.js';
export { modePillContract } from './mode-pill.contract.js';
export { spoonDialContract } from './spoon-dial.contract.js';
export { dropdownContract } from './dropdown.contract.js';
export { commandPaletteContract } from './command-palette.contract.js';
export { cardContract } from './card.contract.js';
export { glassCardContract } from './glass-card.contract.js';
export { candyHeaderContract } from './candy-header.contract.js';
export { chameleonContract } from './chameleon.contract.js';
export { chatShellContract } from './chat-shell.contract.js';
export { crownContract } from './crown.contract.js';