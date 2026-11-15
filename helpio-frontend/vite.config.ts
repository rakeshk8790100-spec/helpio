import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Which client's layouts to build (src/clients/<name>); a client only needs the layouts it changes
  const client = env.VITE_ORG_NAME || 'default'
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@client': fileURLToPath(new URL(`./src/clients/${client}`, import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Dev only: forward API calls to the FastAPI server so the browser stays same-origin (no CORS).
      proxy: {
        '/api': env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
      },
    },
  }
})
