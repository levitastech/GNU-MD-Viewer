/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_L04_HARNESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
