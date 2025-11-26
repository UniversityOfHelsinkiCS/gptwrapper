import * as Sentry from '@sentry/react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import App from './App'
import Chats from './components/Chats'
import { ChatV2 } from './components/ChatV2/ChatV2'
import { NotFound } from './components/common/NotFound'
import { ErrorPage } from './components/ErrorPage'
import NoAccess from './components/NoAccess'
import Rag from './components/Rag/Rag'
import { RagFile } from './components/Rag/RagFile'
import { RagIndex } from './components/Rag/RagIndex'
import { EmbeddedLoginHelper } from './components/EmbeddedLoginHelper'

const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)

const router = sentryCreateBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />} ErrorBoundary={ErrorPage}>
      <Route path="/" element={<Navigate to="/general" />} />
      <Route path="/admin/*" lazy={() => import('./components/Admin')} />
      {/* <Route path="/courses/:courseId/*" lazy={() => import('./components/Courses/Course')} /> */}
      <Route path="/noaccess" element={<NoAccess />} />
      <Route path="/chats" element={<Chats />} />
      <Route path="/statistics" lazy={() => import('./components/Statistics')} />
      <Route path="/rag" element={<Rag />} />
      <Route path="/rag/:id" element={<RagIndex />} />
      <Route path="/rag/:id/files/:fileId" element={<RagFile />} />
      <Route path="/login-helper" element={<EmbeddedLoginHelper />} />
      <Route path="/:courseId/*" element={<ChatV2 />} />
      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
  {
    basename: PUBLIC_URL,
  },
)

const Router = () => <RouterProvider router={router} />

export default Router
