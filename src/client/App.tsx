import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { Box } from '@mui/material'

import router from './router'
import NavBar from './components/NavBar'

const App = () => (
  <Box>
    <NavBar />
    <RouterProvider router={router} />
  </Box>
)

export default App
