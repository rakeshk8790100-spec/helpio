
/// <reference types="vite/client" />

/** VITE_* values read in code; see .env.example */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_ORG_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
