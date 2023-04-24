import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { inStaging } from './src/config'

const baseUrl = inStaging ? '/gptwrapper' : '/'
const proxyUrl = inStaging ? '/gptwrapper/api/' : '/api/'

const config = {
  plugins: [react()],
  base: baseUrl,
  server: {
    proxy: {},
    watch: {
      usePolling: true,
    },
    host: true,
    strictPort: true,
    port: 3000,
  },
  define: {
    'process.env': process.env,
  },
}

config.server.proxy[proxyUrl] = {
  target: 'http://localhost:8000',
  changeOrigin: true,
  secure: false,
}

export default defineConfig(config)
