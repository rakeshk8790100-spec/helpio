export const envConfig = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) || '/api',
  appEnv: import.meta.env.MODE || 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

export default envConfig;
