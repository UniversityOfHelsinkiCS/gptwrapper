import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { useParams, useSearchParams } from 'react-router-dom'
import type { Prompt } from '../../types'
import apiClient, { type ApiError } from '../../util/apiClient'
import { type UseMutateAsyncFunction, useMutation, useQuery } from '@tanstack/react-query'
import useCourse from '../../hooks/useCourse'
import { useAnalyticsDispatch } from '../../stores/analytics'
import type { PromptCreationParams, PromptEditableParams } from '@shared/prompt'
import type { MessageGenerationInfo } from '@shared/chat'

export type CreatePromptMutation = UseMutateAsyncFunction<void, ApiError, Omit<PromptCreationParams, 'userId'>, unknown>
export type DeletePromptMutation = UseMutateAsyncFunction<void, ApiError, string, unknown>
export type EditPromptMutation = UseMutateAsyncFunction<void, ApiError, PromptEditableParams & { id: string }, unknown>

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
    if (courseId !== 'general') {
      refetchCourse()
    }
  }

  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'

  const [activePrompt, setActivePrompt] = useLocalStorageState<Prompt | undefined>(`${localStoragePrefix}-active-prompt`, undefined)

  const urlPrompt = course?.prompts.find((p) => p.id === urlPromptId)
  const isPromptHidden = activePrompt?.hidden ?? false
  const isPromptEditable = activePrompt === undefined || activePrompt?.type === 'PERSONAL'
  const dispatchAnalytics = useAnalyticsDispatch()

  /**
   * This handles every prompt change and updates related data as needed.
   */
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

    if (course && activePrompt) {
      const isValid =
        course.prompts.includes(activePrompt) ||
        myPrompts.includes(activePrompt)

      if (!isValid) {
        handleChangePrompt(undefined);
      }
    }
  }, [
    urlPrompt,
    course,
    activePrompt,
    myPrompts,
    handleChangePrompt,
  ])

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

  const ownPromptSaveMutation = useMutation({
    mutationFn: async ({ name, promptToSave, systemMessage }: { name: string; promptToSave?: Prompt; systemMessage: string }) => {
      if (promptToSave && promptToSave.type !== 'PERSONAL') return // Only do this for personal prompts

      const promptData = {
        name,
        systemMessage,
        type: 'PERSONAL',

      }

      if (promptToSave) {
        const res = await apiClient.put<Prompt>(`/prompts/${promptToSave.id}`, promptData)
        setActivePrompt(res.data)
      } else {
        const res = await apiClient.post<Prompt>('/prompts', promptData)
        setActivePrompt(res.data)
      }

      refetchPrompts()
    },
  })

  const ownPromptDeleteMutation = useMutation({
    mutationFn: async (prompt: Prompt) => {
      if (prompt.type !== 'PERSONAL') return // Only do this for personal prompts

      await apiClient.delete(`/prompts/${prompt.id}`)
      refetchPrompts()

      if (activePrompt?.id === prompt.id) {
        setActivePrompt(undefined)
      }
    },
  })

  const createPromptMutation = useMutation({
    mutationFn: async (data: Omit<PromptCreationParams, 'userId'>) => {
      const res = await apiClient.post(`/prompts`, data)
      setActivePrompt(res.data)
      refetchPrompts()
    }
  })

  const deletePromptMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/prompts/${id}`)
      refetchPrompts()
    }
  })

  const editPromptMutation = useMutation({
    mutationFn: async (data: PromptEditableParams & { id: string }) => {
      const res = await apiClient.put(`prompts/${data.id}`, data)
      setActivePrompt(res.data)
      refetchPrompts()
    }
  })


  const promptInfo: MessageGenerationInfo['promptInfo'] = activePrompt
    ? {
      id: activePrompt.id,
      name: activePrompt.name,
      type: 'saved',
      systemMessage: activePrompt.systemMessage,
      model: activePrompt.model,
      temperature: activePrompt.temperature,
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
    saveOwnPrompt: ownPromptSaveMutation.mutateAsync,
    deleteOwnPrompt: ownPromptDeleteMutation.mutateAsync,
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
