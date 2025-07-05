import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// eslint-disable-next-line no-nested-ternary
const ciBase = '/'
const developmentBase = '/'
const stagingBase = '/gptwrapper'
const productionBase = '/chat'

let base = developmentBase

if (process.env.STAGING === 'true') {
  base = stagingBase
}

if (process.env.NODE_ENV === 'production') {
  base = productionBase
}

const inCI = process.env.CI === 'true'
if (inCI) {
  base = ciBase
}

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    minify: inCI ? false : 'esbuild',
    sourcemap: inCI ? 'inline' : undefined,
  },
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
