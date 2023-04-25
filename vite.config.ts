import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { inProduction, inStaging } from './src/config'

// eslint-disable-next-line no-nested-ternary
const base = inProduction ? '/chat' : inStaging ? '/gptwrapper' : '/'

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
