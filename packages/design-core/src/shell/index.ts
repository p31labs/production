export {
  type ShellSlot,
  type BlockCategory,
  type BlockPlacement,
  type BlockDefinition,
  SHELL_SLOT_CATEGORY,
  placementValid,
  type ShellConfig,
} from './contract';
export {
  type BlockRegistry,
  blockForPlacement,
  BlockList,
  ShellFrame,
  renderShellConfig,
  SHELL_SLOTS,
  type ShellFrameProps,
} from './render';
export { PortalShell, type PortalShellProps, type PortalShellConfig } from './PortalShell';
export {
  type AccountMenuSpec,
  type IdentityFill,
} from './identity';
export {
  type CartridgeBlock,
  type CartridgeRoute,
  type CartridgeManifest,
  CARTRIDGE_ALLOWED_FIELDS,
  validateCartridgeOwnership,
  resolveShellTheme,
} from './cartridge';
export {
  CartridgeShell,
  CartridgeError,
  renderCartridgeRoute,
  type CartridgeShellProps,
  type CartridgeBlockRenderer,
} from './CartridgeShell';
export {
  verifySRI,
  loadRemoteCartridge,
  type LoadRemoteOptions,
  type RemoteCartridgeResult,
} from './loadRemote';
export {
  useCartridgeConsole,
  type CartridgeConsoleState,
  type CartridgeRegistry,
} from './store';
export { CartridgeConsole, type CartridgeConsoleProps } from './CartridgeConsole';
export { CartridgeSwitcher, type CartridgeSwitcherItem, type CartridgeSwitcherProps } from './CartridgeSwitcher';
export { ThemePicker, type ThemePickerProps } from './ThemePicker';
export { CartridgeComposer, type CartridgeComposerProps } from './CartridgeComposer';
export { ShellAmbient, LedChip, useLedChipStore, LED_MODES } from './ambient';
export {
  type TopbarFace,
  type FaceMode,
  type FaceAction,
  FACE_ALLOWED_FIELDS,
  validateFace,
} from './face';
export { PortalTopbar, type PortalTopbarProps } from './PortalTopbar';
export { SearchBox, type SearchBoxProps } from './SearchBox';
