import * as Sentry from '@sentry/react'

import { GIT_SHA } from '../../config'
import React from 'react'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom'

const initializeSentry = () => {
  Sentry.init({
    dsn: 'https://fdfc80050182461ff686cd6c96129256@toska.cs.helsinki.fi/27',
    release: GIT_SHA,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [/^\/api/],
  })
}

export default initializeSentry
