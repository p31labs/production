/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_P31_SUBSTRATE_URL?: string;
  readonly VITE_DISPATCH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}