// This file provides type definitions for Vite environment variables.
// We manually define ImportMetaEnv since the 'vite/client' type definition is missing.

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
