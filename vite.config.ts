import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { inProduction, inStaging, inCI } from './src/config'

// eslint-disable-next-line no-nested-ternary
const ciBase = '/'
const developmentBase = '/'
const stagingBase = '/gptwrapper'
const productionBase = '/chat'

let base = developmentBase

if (inStaging) {
  base = stagingBase
}

if (inProduction) {
  base = productionBase
}

if (inCI) {
  base = ciBase
}

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    proxy: {
      '/api/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
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
})
