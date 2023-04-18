import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { Box } from '@mui/material'

import useTheme from './theme'
import router from './router'
import NavBar from './components/NavBar'
import Footer from './components/Footer'

const App = () => {
  const theme = useTheme()

  return (
    <ThemeProvider theme={theme}>
      <Box>
        <NavBar />
        <RouterProvider router={router} />
        <Footer />
      </Box>
    </ThemeProvider>
)}

export default App
