import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'

import { PUBLIC_URL } from '../config'
import initializeI18n from './util/i18n'
import App from './App'

initializeI18n()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={PUBLIC_URL}>
      <CssBaseline>
        <App />
      </CssBaseline>
    </BrowserRouter>
  </React.StrictMode>
)
