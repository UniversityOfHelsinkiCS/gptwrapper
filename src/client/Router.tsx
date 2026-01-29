import * as Sentry from '@sentry/react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import App from './App'
import { ChatV2 } from './components/ChatV2/ChatV2'
import { NotFound } from './components/common/NotFound'
import { ErrorPage } from './components/ErrorPage'
import NoAccess from './components/NoAccess'
import { EmbeddedLoginHelper } from './components/EmbeddedLoginHelper'

const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)

const router = sentryCreateBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />} ErrorBoundary={ErrorPage}>
      <Route path="/" element={<Navigate to="/general" />} />
      <Route path="/admin/*" lazy={() => import('./components/Admin')} />
      <Route path="/noaccess" element={<NoAccess />} />
      <Route path="/statistics" lazy={() => import('./components/Statistics')} />
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
