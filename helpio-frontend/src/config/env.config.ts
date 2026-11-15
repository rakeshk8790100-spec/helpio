
/** Typed access to the VITE_* values (declared in src/vite-env.d.ts). */
export const envConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  /** Google Identity Services web client ID; Google sign-in is hidden when empty */
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  /** The client whose screens are built (src/clients/<orgName>) */
  orgName: import.meta.env.VITE_ORG_NAME || 'default',
  appEnv: import.meta.env.MODE || 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

export default envConfig;
