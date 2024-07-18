import React from 'react'
import {
  RouterProvider,
  Route,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom'

import { BASE_PATH } from '../config'
import App from './App'
import Admin from './components/Admin'
import Chat from './components/Chat'
import Courses from './components/Courses'
import EditCourse from './components/Courses/EditCourse'
import NoAccess from './components/NoAccess'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index element={<Chat />} />
      <Route path="/:courseId" element={<Chat />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:id" element={<EditCourse />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/noaccess" element={<NoAccess />} />
    </Route>
  ),
  {
    basename: BASE_PATH,
  }
)

const Router = () => <RouterProvider router={router} />

export default Router
