import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

const httpsConfig = (() => {
  try {
    const cert = fs.readFileSync('./192.168.1.51+3.pem')
    const key = fs.readFileSync('./192.168.1.51+3-key.pem')
    return { key, cert }
  } catch {
    return undefined
  }
})()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    https: httpsConfig,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
