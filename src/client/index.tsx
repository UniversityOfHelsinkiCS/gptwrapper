import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import CssBaseline from '@mui/material/CssBaseline'

import Router from './Router'
import initializeSentry from './util/sentry'
import initializeI18n from './util/i18n'
import queryClient from './util/queryClient'

initializeSentry()
initializeI18n()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CssBaseline>
        <Router />
      </CssBaseline>
    </QueryClientProvider>
  </React.StrictMode>
)
