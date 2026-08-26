import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

// Vite config — handles both dev (with /api proxy) and production builds.
//
// In dev:
//   - The frontend runs on https://localhost:5173 (or http if no certs)
//   - /api/* requests are proxied to the backend at the URL in VITE_DEV_BACKEND
//     (defaults to http://localhost:5000)
//
// In production:
//   - Build output: dist/
//   - The frontend calls the backend at the URL in VITE_API_URL (build-time)
//     OR a runtime override set via the Profile → Backend Settings page.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devBackend = env.VITE_DEV_BACKEND || 'http://localhost:5000'

  // Optional HTTPS in dev (only if cert files exist — used for mobile testing)
  let httpsConfig
  try {
    const cert = fs.readFileSync('./localhost.pem')
    const key  = fs.readFileSync('./localhost-key.pem')
    httpsConfig = { key, cert }
  } catch {
    httpsConfig = undefined
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      https: httpsConfig,
      host: true,  // allows testing from a phone on the same WiFi
      proxy: {
        '/api': {
          target: devBackend,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: devBackend,
          changeOrigin: true,
        },
      },
    },
  }
})
