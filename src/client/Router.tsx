import * as Sentry from '@sentry/react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import App from './App'
import Chats from './components/Chats'
import { ChatV2 } from './components/ChatV2/ChatV2'
import Courses from './components/Courses'
import { NotFound } from './components/common/NotFound'
import { ErrorPage } from './components/ErrorPage'
import NoAccess from './components/NoAccess'
import Rag from './components/Rag/Rag'
import { RagFile } from './components/Rag/RagFile'
import { RagIndex } from './components/Rag/RagIndex'

const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)

const CourseRedirect = () => {
  const { courseId } = useParams()
  return <Navigate to={`/${courseId}`} replace />
}

const router = sentryCreateBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />} ErrorBoundary={ErrorPage}>
      <Route index element={<ChatV2 />} />
      <Route path="/v1" element={<Navigate to="/" replace />} />
      <Route path="/v2" element={<Navigate to="/" />} />
 
      <Route path="/:courseId" element={<ChatV2 />} />
      <Route path="/v2/:courseId" element={<CourseRedirect />} />
      <Route path="/v1/:courseId" element={<CourseRedirect />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:id/*" lazy={() => import('./components/Courses/Course') } />
      <Route path="/admin/*" lazy={() => import('./components/Admin')} />
      <Route path="/noaccess" element={<NoAccess />} />
      <Route path="/chats" element={<Chats />} />
      <Route path="/statistics" lazy={() => import('./components/Statistics')} />
      <Route path="/rag" element={<Rag />} />
      <Route path="/rag/:id" element={<RagIndex />} />
      <Route path="/rag/:id/files/:fileId" element={<RagFile />} />
      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
  {
    basename: PUBLIC_URL,
  },
)

const Router = () => <RouterProvider router={router} />

export default Router
