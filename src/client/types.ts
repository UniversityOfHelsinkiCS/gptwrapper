export type Role = 'system' | 'assistant' | 'user'

export interface Message {
  id: string
  role: Role
  content: string
}
