import React from 'react'
import { Route, Routes } from 'react-router-dom'

import Admin from './components/Admin'
import Chat from './components/Chat'
import NoAccess from './components/NoAccess'

const Router = () => (
  <Routes>
    <Route path="/*" element={<Chat />} />
    <Route path="/admin" element={<Admin />} />
    <Route path="/noaccess" element={<NoAccess />} />
  </Routes>
)

export default Router
