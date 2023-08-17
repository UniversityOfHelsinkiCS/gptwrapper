import { Request } from 'express'
import OpenAI from 'openai'

export interface User {
  id: string
  username: string
  language?: string
  iamGroups: string[]
  email?: string
  isAdmin: boolean
  activeCourseIds: string[]
}

export interface ChatRequest extends Request {
  body: RequestBody
  user: User
}

export type APIError = typeof OpenAI.APIError

export type OpenAIStream = ReturnType<
  typeof OpenAI.prototype.chat.completions.create
>

export type Message = OpenAI.Chat.ChatCompletionMessage

export type StreamingOptions =
  OpenAI.Chat.Completions.CompletionCreateParamsStreaming

interface RequestBody {
  id?: string
  options?: StreamingOptions
}

export interface Service {
  id: string
  name: string
  description: string
  usageLimit: number
}

export type Role = 'system' | 'assistant' | 'user'

export type Enrollment = {
  id: string
  personId: string
  state: string
  courseUnitRealisation: {
    id: string
    name: string
    nameSpecifier: string
    activityPeriod: {
      startDate: string
      endDate: string
    }
  }
}
