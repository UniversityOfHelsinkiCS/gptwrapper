import { useQuery } from '@tanstack/react-query'
import type { ToolInfo } from '@shared/promptTools'
import apiClient from '../util/apiClient'

const NO_TOOLS: ToolInfo[] = []

/** The tools the current user can add to a prompt, from the server's tool registry. */
const useAddableTools = () => {
  const { data, ...rest } = useQuery<ToolInfo[]>({
    queryKey: ['tools'],
    queryFn: async () => (await apiClient.get('/tools')).data,
    staleTime: Infinity,
  })
  return { tools: data ?? NO_TOOLS, ...rest }
}

export default useAddableTools
