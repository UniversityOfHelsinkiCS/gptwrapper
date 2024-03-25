import { Request } from 'express'
import OpenAI from 'openai'
import { ChatRequestMessage } from '@azure/openai'

export interface User {
  id: string
  username: string
  language?: string
  iamGroups: string[]
  email?: string
  isAdmin: boolean
  isPowerUser: boolean
  activeCourseIds: string[]
  ownCourses: string[]
}

export interface RequestWithUser extends Request {
  user: User
}

export interface ChatRequest extends RequestWithUser {
  body: RequestBody
}

export interface CourseChatRequest extends ChatRequest {
  params: {
    courseId: string
  }
}

export type APIError = typeof OpenAI.APIError

export type OpenAIStream = ReturnType<
  typeof OpenAI.prototype.chat.completions.create
>

export type Message = OpenAI.Chat.ChatCompletionMessage

export type StreamingOptions =
  OpenAI.Chat.Completions.CompletionCreateParamsStreaming

export type AzureOptions = {
  model: string
  messages: ChatRequestMessage[]
}

interface RequestBody {
  id?: string
  options?: StreamingOptions
}

export interface ChatInstance {
  id: string
  name: string
  description: string
  usageLimit: number
}

export type Role = 'system' | 'assistant' | 'user'

export type ActivityPeriod = {
  startDate: string
  endDate: string
}

export type CourseUnitRealisation = {
  id: string
  name: object
  nameSpecifier: object
  activityPeriod: ActivityPeriod
}

export type Enrollment = {
  id: string
  personId: string
  state: string
  courseUnitRealisation: CourseUnitRealisation
}

export type Prompt = {
  id: string
  chatInstanceId: string
  systemMessage: string
  messages: Message[]
}

type Locales = {
  fi: string
  en: string
  sv: string
}

type Programme = {
  key: string
  name: Locales
  level: string
  companionFaculties: Array<string>
  international: boolean
}

export interface OrganisationData {
  code: string
  name: Locales
  programmes: Array<Programme>
}
