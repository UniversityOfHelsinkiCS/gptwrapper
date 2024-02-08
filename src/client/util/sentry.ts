import * as Sentry from '@sentry/browser'

import { inDevelopment, inStaging, GIT_SHA } from '../../config'

const initializeSentry = () => {
  if (inDevelopment || inStaging) return

  Sentry.init({
    dsn: 'https://9dde7af6dc3bc7deaf1e53c7def25c28@toska.cs.helsinki.fi/21',
    release: GIT_SHA,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  })
}

export default initializeSentry
