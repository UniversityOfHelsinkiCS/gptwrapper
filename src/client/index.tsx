import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// This is only included in bundle in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import Router from './Router'
import initializeSentry from './util/sentry'
import initializeI18n from './util/i18n'
import queryClient from './util/queryClient'
import { inDevelopment } from '../config'

const ReactQueryDevtoolsProduction = inDevelopment
  ? ReactQueryDevtools
  : React.lazy(() =>
      import('@tanstack/react-query-devtools/build/modern/production.js').then((d) => ({
        default: d.ReactQueryDevtools,
      })),
    )

initializeSentry()
initializeI18n()

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
          <ReactQueryDevtoolsProduction />
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
