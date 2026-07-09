import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vitest/config'
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
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  plugins: [
    react({
      babel: {
        plugins: [
          // other Babel plugins
          [
            '@locator/babel-jsx/dist',
            {
              env: 'development',
            },
          ],
        ],
      },
    }),
    sentryVitePlugin({
      org: 'sentry',
      project: 'currechat-frontend',
      url: 'https://toska.it.helsinki.fi/',
      telemetry: false,
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
      },
    }),
  ],
  base,
  build: {
    minify: inCI ? false : 'esbuild',
    sourcemap: true,
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
  // Only expose the env vars the client bundle actually reads (via src/config.ts).
  // Passing the whole `process.env` bakes every build-time secret (tokens, PATH, …)
  // into the client-side JS, which is a security leak.
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.STAGING': JSON.stringify(process.env.STAGING),
    'process.env.CI': JSON.stringify(process.env.CI),
    'process.env.REACT_APP_GIT_SHA': JSON.stringify(process.env.REACT_APP_GIT_SHA),
    'process.env.PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL),
    'process.env.DEFAULT_TOKEN_LIMIT': JSON.stringify(process.env.DEFAULT_TOKEN_LIMIT),
    'process.env.DEFAULT_MODEL': JSON.stringify(process.env.DEFAULT_MODEL),
    'process.env.FREE_MODEL': JSON.stringify(process.env.FREE_MODEL),
  },
  resolve: {
    alias: {
      '@shared': '/src/shared',
      '@config': '/src/config.ts',
      src: '/src',
    },
  },
})
