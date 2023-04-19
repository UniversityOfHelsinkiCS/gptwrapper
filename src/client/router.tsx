import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import Admin from './components/Admin'
import Chat from './components/Chat'
import Error from './components/Error'

const router = createBrowserRouter([
  {
    path: PUBLIC_URL,
    element: <Chat />,
    errorElement: <Error />,
  },
  {
    path: `${PUBLIC_URL}/admin`,
    element: <Admin />,
  },
])

export default router
