import React from 'react'
import ReactDOM from 'react-dom/client'

import initializeI18n from './util/il18n'
import App from './App'

initializeI18n()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
