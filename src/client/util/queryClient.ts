import { QueryClient } from '@tanstack/react-query'

import '@tanstack/react-query'
import type { ApiError } from './apiClient'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}

const queryClient = new QueryClient()

export default queryClient
