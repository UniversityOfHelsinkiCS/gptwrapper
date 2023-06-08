import { Request } from 'express'
import {
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from 'openai'

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

export type ApiResponse = ApiError | CreateChatCompletionResponse

export interface Service {
  id: string
  name: string
  description: string
  usageLimit: string
}

export type Role = 'system' | 'assistant' | 'user'

export interface Message {
  role: Role
  content: string
}
