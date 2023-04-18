import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

import Admin from './components/Admin'
import Chat from './components/Chat'
import Error from './components/Error'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Chat />,
    errorElement: <Error />,
  },
  {
    path: 'admin',
    element: <Admin />,
  },
])

export default router
