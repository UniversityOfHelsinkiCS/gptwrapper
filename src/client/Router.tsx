import * as Sentry from '@sentry/react'
import { useMediaQuery, useTheme } from '@mui/material'
import { createBrowserRouter, createRoutesFromElements, Navigate, Outlet, Route, RouterProvider, useLocation } from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import App from './App'
import { ChatV2 } from './components/ChatV2/ChatV2'
import { NotFound } from './components/common/NotFound'
import { ErrorPage } from './components/ErrorPage'
import NoAccess from './components/NoAccess'
import { EmbeddedLoginHelper } from './components/EmbeddedLoginHelper'
import NotificationBanner from './components/common/NotificationBanner'
import { isManagementPage } from './components/BackToChatButton'

const bannerBetweenButtonsSx = { pt: '10px', pl: 'var(--back-button-right, 16px)' }
const bannerBelowButtonsSx = { pt: 'var(--back-button-bottom, 8px)', pr: 2 }

const BannerLayout = () => {
  const { pathname } = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const managementSx = isMobile ? bannerBelowButtonsSx : bannerBetweenButtonsSx
  return (
    <>
      <NotificationBanner sx={isManagementPage(pathname) ? managementSx : undefined} />
      <Outlet />
    </>
  )
}

const sentryCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)

const router = sentryCreateBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />} ErrorBoundary={ErrorPage}>
      <Route path="/" element={<Navigate to="/general" />} />
      <Route element={<BannerLayout />}>
        <Route path="/admin/*" lazy={() => import('./components/Admin')} />
        <Route path="/course-creator/*" lazy={() => import('./components/CourseCreator')} />
        <Route path="/noaccess" element={<NoAccess />} />
        <Route path="/statistics/*" lazy={() => import('./components/Statistics')} />
        <Route path="/login-helper" element={<EmbeddedLoginHelper />} />
        <Route path="/changelog" lazy={() => import('./components/Changelog')} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/:courseId/*" element={<ChatV2 />} />
    </Route>,
  ),
  {
    basename: PUBLIC_URL,
  },
)

const Router = () => <RouterProvider router={router} />

export default Router
