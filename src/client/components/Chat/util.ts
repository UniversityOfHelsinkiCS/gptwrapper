import { CreateChatCompletionResponse } from 'openai'

import { Message } from '../../types'
import apiClient from '../../util/apiClient'

const errorResponse: Message = {
  role: 'assistant',
  content: 'Something went wrong',
}

export const getResponse = (data: CreateChatCompletionResponse): Message => {
  const { role, content } = data?.choices?.[0]?.message || {}

  if (!role || !content) return errorResponse

  return {
    role,
    content,
  }
}

export const getChatCompletion = async (
  system: string,
  messages: Message[]
): Promise<CreateChatCompletionResponse> => {
  const { data } = await apiClient.post('/chat', {
    id: 'chat',
    options: {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: system,
        },
        ...messages,
      ],
    },
  })

  return data
}
