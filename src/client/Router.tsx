import { RouterProvider, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom'

import { PUBLIC_URL } from '../config'
import App from './App'
import Admin from './components/Admin'
import Chat from './components/Chat'
import Courses from './components/Courses'
import Course from './components/Courses/Course'
import NoAccess from './components/NoAccess'
import Chats from './components/Chats'
import Statistics from './components/Statistics'
import Rag from './components/Rag/Rag'
import { ChatV2 } from './components/ChatV2/ChatV2'
import { RagIndex } from './components/Rag/RagIndex'
import { RagFile } from './components/Rag/RagFile'
import { NotFound } from './components/common/NotFound'
import { ErrorBoundary } from './components/ErrorBoundary'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index element={<Chat />} />
      <Route path="/v2" element={<ChatV2 />} />
      <Route path="/v2/:courseId" element={<ChatV2 />} />
      <Route path="/:courseId" element={<Chat />} />
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

const Router = () => (
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>
)

export default Router
