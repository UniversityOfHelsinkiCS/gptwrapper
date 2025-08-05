import * as Sentry from '@sentry/react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import App from './App'
import Admin from './components/Admin'
import Chat from './components/Chat'
import Chats from './components/Chats'
import { ChatV2 } from './components/ChatV2/ChatV2'
import Courses from './components/Courses'
import Course from './components/Courses/Course'
import { NotFound } from './components/common/NotFound'
import { ErrorPage } from './components/ErrorPage'
import NoAccess from './components/NoAccess'
import Rag from './components/Rag/Rag'
import { RagFile } from './components/Rag/RagFile'
import { RagIndex } from './components/Rag/RagIndex'
import Statistics from './components/Statistics'
import useCurrentUser from './hooks/useCurrentUser'

const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)

const PreferenceRedirect = () => {
  const { user } = useCurrentUser()
  const { courseId } = useParams()
  const chatVersion = user?.preferences?.chatVersion ?? 1
  return <Navigate to={chatVersion === 1 ? '/v1' : '/v2' + (courseId ? `/${courseId}` : '')} replace />
}

const router = sentryCreateBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />} ErrorBoundary={ErrorPage}>
      <Route index element={<PreferenceRedirect />} />
      <Route path="/v1" element={<Chat />} />
      <Route path="/v2" element={<ChatV2 />} />

      <Route path="/:courseId" element={<PreferenceRedirect />} />
      <Route path="/v2/:courseId" element={<ChatV2 />} />
      <Route path="/v1/:courseId" element={<Chat />} />

      <Route path="/courses" element={<Courses />} />
      <Route path="/courses/:id/*" element={<Course />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/noaccess" element={<NoAccess />} />
      <Route path="/chats" element={<Chats />} />
      <Route path="/statistics" element={<Statistics />} />
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
