import * as Sentry from '@sentry/node'

import { inDevelopment, inStaging, GIT_SHA } from '../../config'

const initializeSentry = () => {
  if (inDevelopment || inStaging) return

  Sentry.init({
    dsn: 'https://7486caafc9ff5451fa4db6de8ca5e03d@toska.it.helsinki.fi/2',
    release: GIT_SHA,
    integrations: [Sentry.httpIntegration({ breadcrumbs: true }), Sentry.expressIntegration()],
    tracesSampleRate: 1.0,
  })
}

export default initializeSentry
