import { Request } from 'express'

interface RequestBody {
  id?: string
  prompt?: string
}

export interface User {
  id: string
  username: string
  language?: string
  iamGroups: string[]
}

export interface ChatRequest extends Request {
  body: RequestBody
  user: User
}
