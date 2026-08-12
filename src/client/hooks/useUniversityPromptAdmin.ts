import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import queryClient from '../util/queryClient'
import type { UniversityPromptBody, UniversityPromptType } from '@shared/prompt'

export const universityPromptsQueryKey = ['uniprompts']

export type UniversityPromptLanguage = 'fi' | 'en' | 'sv'

export const universityPromptLanguages: UniversityPromptLanguage[] = ['fi', 'en', 'sv']

export type UniversityPromptLanguageBody = NonNullable<UniversityPromptBody['fi']>

export type UniversityPromptChild = {
  id: string
  name: string
  userInstructions?: string | null
  systemMessage: string
  messages?: UniversityPromptLanguageBody['messages']
  type: UniversityPromptType
  language?: UniversityPromptLanguage | null
}

export type UniversityPromptGroup = {
  id: string
  published: boolean
  createdAt: string
  updatedAt: string
  prompts?: UniversityPromptChild[]
}

export const useUniversityPromptGroups = () => {
  const queryFn = async (): Promise<UniversityPromptGroup[]> => {
    const res = await apiClient.get<UniversityPromptGroup[]>('/uniprompts')
    return res.data
  }

  const { data: groups, ...rest } = useQuery({ queryKey: universityPromptsQueryKey, queryFn })

  return { groups: groups ?? [], ...rest }
}

const invalidate = () => queryClient.invalidateQueries({ queryKey: universityPromptsQueryKey })

export const useCreateUniversityPromptMutation = () =>
  useMutation({
    mutationFn: async (body: UniversityPromptBody) => {
      const res = await apiClient.post<UniversityPromptGroup>('/uniprompts', body)
      return res.data
    },
    onSuccess: invalidate,
  })

export const useUpdateUniversityPromptMutation = () =>
  useMutation({
    mutationFn: async ({ id, ...body }: UniversityPromptBody & { id: string }) => {
      const res = await apiClient.put<UniversityPromptGroup>(`/uniprompts/${id}`, body)
      return res.data
    },
    onSuccess: invalidate,
  })

export const useDeleteUniversityPromptMutation = () =>
  useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/uniprompts/${id}`)
    },
    onSuccess: invalidate,
  })

export const groupToBody = (group: UniversityPromptGroup, overrides: Partial<UniversityPromptBody> = {}): UniversityPromptBody => {
  const children = group.prompts ?? []

  const languages = Object.fromEntries(
    universityPromptLanguages
      .map((language) => [language, children.find((prompt) => prompt.language === language)] as const)
      .filter(([, prompt]) => Boolean(prompt))
      .map(([language, prompt]) => [
        language,
        {
          name: prompt!.name,
          userInstructions: prompt!.userInstructions ?? '',
          systemMessage: prompt!.systemMessage,
          messages: prompt!.messages ?? [],
        },
      ]),
  )

  return {
    type: children[0]?.type ?? 'UNIVERSITY',
    published: group.published,
    ...languages,
    ...overrides,
  }
}
