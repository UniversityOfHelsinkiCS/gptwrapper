import { useQuery } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import type { Prompt, PromptLanguage } from '../types'

/**
 * Shared with the admin side (`useUniversityPromptAdmin`), which hits the same
 * endpoint and invalidates this key on every mutation.
 */
export const queryKey = ['uniprompts']

export const promptLanguages: PromptLanguage[] = ['fi', 'en', 'sv']

export type UniversityPromptGroup = {
  id: string
  published: boolean
  createdAt: string
  updatedAt: string
  prompts: Prompt[]
}

export const groupLanguages = (group: UniversityPromptGroup): PromptLanguage[] =>
  promptLanguages.filter((language) => group.prompts.some((prompt) => prompt.language === language))

const useUniversityPrompts = () => {
  const queryFn = async (): Promise<UniversityPromptGroup[]> => {
    const res = await apiClient.get<UniversityPromptGroup[]>('/uniprompts')

    return res.data.map((group) => ({ ...group, prompts: group.prompts ?? [] }))
  }

  const { data, ...rest } = useQuery({ queryKey, queryFn })

  return { groups: data ?? [], ...rest }
}

export default useUniversityPrompts
