import React from 'react'
import {
  RouterProvider,
  Route,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import App from './App'
import Admin from './components/Admin'
import Chat from './components/Chat'
import Courses from './components/Courses'
import Course from './components/Courses/Course'
import NoAccess from './components/NoAccess'
import Chats from './components/Chats'
import Statistics from './components/Admin/Statistics'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index element={<Chat />} />
      <Route path="/:courseId" element={<Chat />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:id" element={<Course />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/noaccess" element={<NoAccess />} />
      <Route path="/chats" element={<Chats />} />
      <Route path="/statistics" element={<Statistics />} />
    </Route>
  ),
  {
    basename: PUBLIC_URL,
  }
)

const Router = () => <RouterProvider router={router} />

export default Router
