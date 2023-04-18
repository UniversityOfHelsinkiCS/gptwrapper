import { CreateChatCompletionResponse } from 'openai'

export const getResponse = (
  data: CreateChatCompletionResponse | undefined
): string => data?.choices?.[0]?.message?.content || ''
