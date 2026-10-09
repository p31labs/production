/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}