import * as Sentry from '@sentry/react'

import { GIT_SHA, inCI, inDevelopment, inProduction, inStaging } from '../../config'
import React from 'react'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom'

let environment = 'development'
if (inCI) {
  environment = 'ci'
}
if (inStaging) {
  environment = 'staging'
}
if (inProduction) {
  environment = 'production'
}

export const initializeSentry = () => {
  Sentry.init({
    dsn: 'https://4b537128872afe9f440a22b0824c9026@toska.it.helsinki.fi/3',
    release: GIT_SHA,
    environment,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: false, // data-sentry-mask will be masked.
        maskAllInputs: false, // data-sentry-mask will be masked.
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: inDevelopment ? 1.0 : 0.25,
    replaysOnErrorSampleRate: 1.0,
    tracePropagationTargets: [/^\/api/],
  })
}

