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
import CourseChat from './components/Course/Chat'
import Courses from './components/Courses'
import EditCourse from './components/Courses/EditCourse'
import NoAccess from './components/NoAccess'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index element={<Chat />} />
      <Route path="/:courseId" element={<CourseChat />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:id" element={<EditCourse />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/noaccess" element={<NoAccess />} />
    </Route>
  ),
  {
    basename: PUBLIC_URL,
  }
)

const Router = () => <RouterProvider router={router} />

export default Router
