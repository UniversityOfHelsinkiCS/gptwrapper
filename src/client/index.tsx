import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import CssBaseline from '@mui/material/CssBaseline'
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
      // eslint-disable-next-line import/extensions
      import('@tanstack/react-query-devtools/build/modern/production.js').then(
        (d) => ({
          default: d.ReactQueryDevtools,
        })
      )
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
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <CssBaseline>
        <Router />
      </CssBaseline>
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
  </React.StrictMode>
)
