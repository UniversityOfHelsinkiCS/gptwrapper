import { Request } from 'express'
import { CreateChatCompletionRequest } from 'openai'

interface RequestBody {
  id?: string
  options?: CreateChatCompletionRequest
}

export interface User {
  id: string
  username: string
  language?: string
  iamGroups: string[]
  email?: string
  isAdmin: boolean
}

export interface ChatRequest extends Request {
  body: RequestBody
  user: User
}

export interface ApiError {
  status?: number
  error: object | string
}

export interface Service {
  id: string
  name: string
  description: string
  usageLimit: string
}

export type Role = 'system' | 'assistant' | 'user'
