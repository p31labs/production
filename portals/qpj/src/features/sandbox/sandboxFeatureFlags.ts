export type SandboxFlag =
  | 'persistence'
  | 'composerV2'
  | 'artifactV2'
  | 'focusMode'
  | 'collab'
  | 'voice'
  | 'vision'
  | 'planMode'
  | 'aiRefactor';

export const SANDBOX_FLAGS: Record<SandboxFlag, boolean> = {
  persistence: true,
  composerV2: true,
  artifactV2: true,
  focusMode: false,
  collab: false,
  voice: false,
  vision: false,
  planMode: false,
  aiRefactor: false,
};

export function isSandboxFlagEnabled(flag: SandboxFlag): boolean {
  return SANDBOX_FLAGS[flag];
}
