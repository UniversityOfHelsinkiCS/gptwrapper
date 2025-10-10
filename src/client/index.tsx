import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// This is only included in bundle in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import Router from './Router'
import initializeI18n from './util/i18n'
import queryClient from './util/queryClient'
import { inCI, inDevelopment, inStaging } from '../config'

const ReactQueryDevtoolsProduction = inDevelopment
  ? ReactQueryDevtools
  : React.lazy(() =>
      import('@tanstack/react-query-devtools/build/modern/production.js').then((d) => ({
        default: d.ReactQueryDevtools,
      })),
    )

if (!inDevelopment && !inStaging && !inCI) {
  console.log('Initializing Sentry...')
  import('./util/sentry').then((module) => {
    module.initializeSentry()
  })
}

initializeI18n()

if (inCI) {
  console.log('Adding global error handlers...')

  // Add global error handler to prevent app crashes from network errors
  window.addEventListener('error', (event) => {
    console.warn('Network error caught and prevented from crashing app:', event.error)
    event.preventDefault()
  })

  // Add unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise rejection caught:', event.reason)
    event.preventDefault()
  })
}

const Main = () => {
  const [showDevtools, setShowDevtools] = React.useState(false)

  React.useEffect(() => {
    // @ts-expect-error
    window.toggleDevtools = () => setShowDevtools((old) => !old)
    if (inDevelopment) {
      setShowDevtools(true)
    }

    const adminLoggedInAs = localStorage.getItem('adminLoggedInAs')
    if (adminLoggedInAs) {
      console.log(`%cLogged in as ${adminLoggedInAs}`, 'color: orange')
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      {showDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtoolsProduction buttonPosition='bottom-left' />
        </React.Suspense>
      )}
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>,
)

// Console log vite environment variables

console.log('Vite environment variables', import.meta.env)
