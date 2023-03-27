/* eslint-disable */
import { SnackbarProvider } from 'notistack'

import './index.scss'

const App = ({ Component, pageProps }: { Component: any, pageProps: any }) => (
  <SnackbarProvider preventDuplicate>
    <Component {...pageProps} />
  </SnackbarProvider>
)

export default App
