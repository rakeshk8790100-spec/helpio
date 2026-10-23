export const envConfig = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1',
  /** Google Identity Services web client ID; Google sign-in is hidden when empty */
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '',
  appEnv: import.meta.env.MODE || 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

export default envConfig;
