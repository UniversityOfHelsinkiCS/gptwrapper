import React from 'react'
import { Route, Routes } from 'react-router-dom'

import Admin from './components/Admin'
import Chat from './components/Chat'

const Router = () => (
  <Routes>
    <Route path="/*" element={<Chat />} />
    <Route path="/admin" element={<Admin />} />
  </Routes>
)

export default Router
