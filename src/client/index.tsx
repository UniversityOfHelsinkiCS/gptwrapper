import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import CssBaseline from '@mui/material/CssBaseline'

import initializeI18n from './util/i18n'
import queryClient from './util/queryClient'
import App from './App'

initializeI18n()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CssBaseline>
        <App />
      </CssBaseline>
      <ReactQueryDevtools position="bottom-right" />
    </QueryClientProvider>

  </React.StrictMode>,
)
