import { sentryVitePlugin } from '@sentry/vite-plugin'
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
  plugins: [
    react(),
    sentryVitePlugin({
      disable: !inProduction, // Use this only when making the production build. This should only happen in CI with SENTRY_AUTH_TOKEN specified.
      org: 'toska',
      project: 'currechat-frontend',
      url: 'https://toska.cs.helsinki.fi/',
      telemetry: false,
    }),
  ],
  base,
  build: {
    minify: inCI ? false : 'esbuild',
    sourcemap: inProduction,
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
