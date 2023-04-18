import { useQuery } from 'react-query'
import { CreateChatCompletionResponse } from 'openai'

import apiClient from '../util/apiClient'

const getOptions = (system: string, message: string) => ({
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: system,
    },
    {
      role: 'user',
      content: message,
    },
  ],
})

const useChatCompletion = (system: string, message: string) => {
  const queryKey = ['chatCompletion']

  const query = async (): Promise<CreateChatCompletionResponse> => {
    const { data } = await apiClient.post('/chat', {
      id: 'chat',
      options: getOptions(system, message),
    })

    return data
  }

  const { data: completion, ...rest } = useQuery(queryKey, query)

  return { completion, ...rest }
}

export default useChatCompletion
