import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { useParams, useSearchParams } from 'react-router-dom'
import type { Prompt } from '../../types'
import apiClient, { type ApiError } from '../../util/apiClient'
import { type UseMutateAsyncFunction, useMutation, useQuery } from '@tanstack/react-query'
import useCourse from '../../hooks/useCourse'
import useUniversityPrompts from '../../hooks/useUniversityPrompts'
import { useAnalyticsDispatch } from '../../stores/analytics'
import type { PromptCreationParams, PromptEditableParams } from '@shared/prompt'
import type { MessageGenerationInfo } from '@shared/chat'
import { invalidateAllPromptLists } from 'src/client/util/promptQueries'

export type CreatePromptMutation = UseMutateAsyncFunction<Prompt, ApiError, Omit<PromptCreationParams, 'userId'>, unknown>
export type DeletePromptMutation = UseMutateAsyncFunction<void, ApiError, string, unknown>
export type EditPromptMutation = UseMutateAsyncFunction<Prompt, ApiError, PromptEditableParams & { id: string }, unknown>

interface PromptSelectorStateType {
  activePrompt: Prompt | undefined
  handleChangePrompt: (newPrompt: Prompt | undefined) => void
  coursePrompts: Prompt[]
  myPrompts: Prompt[]
  urlPrompt: Prompt | undefined
  isPromptHidden: boolean
  isPromptEditable: boolean
  promptInfo: MessageGenerationInfo['promptInfo']
  saveOwnPrompt: UseMutateAsyncFunction<
    void,
    ApiError,
    {
      name: string
      promptToSave?: Prompt
      systemMessage: string
    },
    unknown
  >
  deleteOwnPrompt: UseMutateAsyncFunction<void, ApiError, Prompt, unknown>
  createPromptMutation: CreatePromptMutation
  deletePromptMutation: DeletePromptMutation
  editPromptMutation: EditPromptMutation
}

const PromptStateContext = createContext<PromptSelectorStateType | undefined>(undefined)

export const PromptStateProvider: React.FC<{
  children: ReactNode
}> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlPromptId = searchParams.get('promptId')
  const { courseId } = useParams()

  const { data: course, refetch: refetchCourse } = useCourse(courseId)

  const { data: myPrompts, refetch } = useQuery<Prompt[]>({
    queryKey: ['/prompts/my-prompts'],
    initialData: [],
  })

  const refetchPrompts = () => {
    refetch()
    invalidateAllPromptLists()
    if (courseId !== 'general') {
      refetchCourse()
    }
  }

  // Used to validate a selected university prompt: it lives in neither course.prompts
  // nor myPrompts, so without this list an admin's deletion would not clear it.
  const { groups: universityPromptGroups, isPending: universityPromptsPending, isError: universityPromptsFailed } = useUniversityPrompts()
  const universityPrompts = universityPromptGroups.flatMap((group) => group.prompts)

  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'

  const [activePrompt, setActivePrompt] = useLocalStorageState<Prompt | undefined>(`${localStoragePrefix}-active-prompt`, undefined)

  const urlPrompt = course?.prompts.find((p) => p.id === urlPromptId)
  const isPromptHidden = activePrompt?.hidden ?? false
  const isPromptEditable = activePrompt === undefined || activePrompt?.type === 'PERSONAL'
  const dispatchAnalytics = useAnalyticsDispatch()

  const handleChangePrompt = (newPrompt: Prompt | undefined) => {
    if (!newPrompt) {
      setActivePrompt(undefined)
      return
    }

    setActivePrompt(newPrompt)

    // If new prompt is not the url prompt, remove promptId from url
    if (newPrompt.id !== urlPromptId) {
      searchParams.delete('promptId')
      setSearchParams(searchParams)
    }
  }

  useEffect(() => {
    if (urlPrompt) {
      handleChangePrompt(urlPrompt)
    }

    if (course && activePrompt && !universityPromptsPending && !universityPromptsFailed) {
      const freshPrompt =
        universityPrompts.find((p) => p.id === activePrompt.id) ||
        course.prompts?.find((p) => p.id === activePrompt.id) ||
        myPrompts?.find((p) => p.id === activePrompt.id)

      if (!freshPrompt) {
        handleChangePrompt(undefined)
      } else if (JSON.stringify(freshPrompt) !== JSON.stringify(activePrompt)) {
        setActivePrompt(freshPrompt)
      }
    }
  }, [urlPrompt, course, activePrompt, myPrompts, universityPrompts, universityPromptsPending, universityPromptsFailed, handleChangePrompt])

  // Just the analytics dispatch.
  useEffect(() => {
    dispatchAnalytics({
      type: 'SET_ANALYTICS_DATA',
      payload: {
        promptId: activePrompt?.id,
        promptName: activePrompt?.name,
      },
    })
  }, [activePrompt?.id])

  const createPromptMutation = useMutation({
    mutationFn: async (data: Omit<PromptCreationParams, 'userId'>) => {
      const res = await apiClient.post(`/prompts`, data)
      setActivePrompt(res.data)
      refetchPrompts()
      return res.data
    },
  })

  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/prompts/${id}`)
      refetchPrompts()
    },
  })

  const editPromptMutation = useMutation({
    mutationFn: async (data: PromptEditableParams & { id: string }) => {
      const res = await apiClient.put(`prompts/${data.id}`, data)
      setActivePrompt(res.data)
      refetchPrompts()
      return res.data
    },
  })

  const promptInfo: MessageGenerationInfo['promptInfo'] = activePrompt
    ? {
        id: activePrompt.id,
        name: activePrompt.name,
        type: 'saved',
        systemMessage: activePrompt.systemMessage,
      }
    : { type: 'custom', systemMessage: '' }

  const value = {
    activePrompt,
    handleChangePrompt,
    coursePrompts: course?.prompts || [],
    myPrompts,
    urlPrompt,
    promptInfo,
    isPromptHidden,
    isPromptEditable,
    createPromptMutation: createPromptMutation.mutateAsync,
    deletePromptMutation: deletePromptMutation.mutateAsync,
    editPromptMutation: editPromptMutation.mutateAsync,
  }

  return <PromptStateContext.Provider value={value}>{children}</PromptStateContext.Provider>
}

export const usePromptState = (): PromptSelectorStateType => {
  const context = useContext(PromptStateContext)
  if (context === undefined) {
    throw new Error('useCustomSystemMessage must be used within a CustomSystemMessageContext')
  }
  return context
}
