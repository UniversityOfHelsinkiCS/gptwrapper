import { CreateChatCompletionResponse } from 'openai'

import { Message } from '../../types'

const errorResponse: Message = {
  id: 'error',
  role: 'assistant',
  content: 'Something went wrong',
}

export const getResponse = (
  data: CreateChatCompletionResponse | undefined
): Message => {
  const { id } = data || {}
  const { role, content } = data?.choices?.[0]?.message || {}

  if (!id || !role || !content) return errorResponse

  return {
    id,
    role,
    content,
  }
}
