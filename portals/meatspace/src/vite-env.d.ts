/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PINATA_API_KEY: string;
  readonly VITE_PINATA_SECRET_API_KEY: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_PRIVATE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
