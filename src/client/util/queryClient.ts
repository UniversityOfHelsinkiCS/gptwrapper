import { QueryClient } from '@tanstack/react-query'

import '@tanstack/react-query'
import type { ApiError } from './apiClient'
import apiClient from './apiClient'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey: [url] }) => {
        if (typeof url !== 'string') {
          throw new Error(`Invalid URL passed to queryKey: ${url}`)
        }

        const res = await apiClient.get(url)
        return res.data
      },
    },
  },
})

export default queryClient
