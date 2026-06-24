import { Box, CircularProgress, DialogActions } from '@mui/material'
import type { Message } from '@shared/chat'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { useCourseRagIndices, useRagIndices } from '../../hooks/useRagIndices'
import { BlueButton, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { usePromptState } from '../ChatV2/PromptState'
import { PromptEditorFormContext, usePromptEditorState } from './context'
import { PromptEditorForm } from './PromptEditorForm'
import { Prompt, PromptEditorFormContextValue, PromptEditorFormState } from 'src/client/types'

export const PromptEditor = ({ personal, previewPrompt, onDone }: { personal?: boolean; previewPrompt?: any; onDone: (prompt?: Prompt) => void }) => {
  const { t } = useTranslation()
  const { courseId } = useParams() as { courseId: string }
  const { data: chatInstance } = useCourse(courseId)
  const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)
  const { ragIndices: userRagIndices } = useRagIndices()
  const [loading, setLoading] = useState<boolean>(false)
  const { createPromptMutation, editPromptMutation } = usePromptState()

  const ragMessages = [t('prompt:defaultRagMessage'), t('prompt:enforceRagMessage'), t('prompt:unknownRagMessage')]

  const getInitialRagSystemMessages = (rawMessage?: string) => {
    const message = rawMessage?.trim()

    if (!message) return [t('prompt:defaultRagMessage')]

    const presetMessages = ragMessages.filter((presetMessage) => message.includes(presetMessage))

    if (presetMessages.length > 0) {
      const remaining = ragMessages.reduce((currentMessage, presetMessage) => currentMessage.replaceAll(presetMessage, ''), message).trim()
      return remaining ? [...presetMessages, remaining] : presetMessages
    }

    return [message]
  }

  let type: 'CHAT_INSTANCE' | 'PERSONAL' = 'CHAT_INSTANCE'
  if (courseId && courseId !== 'general') type = 'CHAT_INSTANCE'
  if (personal) type = 'PERSONAL'
  if (previewPrompt) type = previewPrompt.type

  const initialRagSystemMessages = previewPrompt
    ? getInitialRagSystemMessages((previewPrompt.messages?.find((m: Message) => m.role === 'system')?.content as string) || '')
    : [t('prompt:defaultRagMessage')]
  const initialCustomMessage = initialRagSystemMessages.find((message) => !ragMessages.includes(message)) ?? ''

  const initialForm: PromptEditorFormState = {
    name: previewPrompt?.name ?? '',
    userInstructions: previewPrompt?.userInstructions ?? '',
    systemMessage: previewPrompt?.systemMessage ?? '',
    ragSystemMessages: initialRagSystemMessages,
    customMessage: initialCustomMessage,
    hidden: previewPrompt?.hidden ?? true,
    ragHidden: previewPrompt?.ragHidden ?? true,
    showCreator: previewPrompt?.showCreator ?? false,
    ragIndexId: previewPrompt?.ragIndexId ?? null,
    userId: previewPrompt?.userId ?? null,
  }

  const cacheKey = `promptEditorForm:${previewPrompt ? `edit:${previewPrompt.id}` : `new:${type}:${courseId}`}`
  const [form, setForm] = useLocalStorageState<PromptEditorFormState>(cacheKey, initialForm)

  const clearCachedForm = () => {
    localStorage.removeItem(cacheKey)
    setForm(initialForm)
  }

  const { setHasChanges, setCacheKey } = usePromptEditorState()

  const hasChanges =
    JSON.stringify({ ...form, ragSystemMessages: [...form.ragSystemMessages].sort() }) !==
    JSON.stringify({ ...initialForm, ragSystemMessages: [...initialForm.ragSystemMessages].sort() })

  useEffect(() => {
    setCacheKey(cacheKey)
  }, [cacheKey, setCacheKey])

  useEffect(() => {
    setHasChanges(hasChanges)

    return () => {
      setHasChanges(false)
    }
  }, [hasChanges, setHasChanges])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name) {
      enqueueSnackbar(t('prompt:missingPromptName'), { variant: 'error' })
      return
    }

    setLoading(true)

    const { name, userInstructions, systemMessage, ragSystemMessages, hidden, ragHidden, ragIndexId, showCreator } = form
    const ragSystemMessage = ragSystemMessages.join(' ')

    const messages: Message[] = ragIndexId && ragSystemMessage.length > 0 ? [{ role: 'system', content: ragSystemMessage }] : []

    try {
      if (previewPrompt) {
        const editedPrompt = await editPromptMutation({
          id: previewPrompt.id,
          name,
          userInstructions,
          systemMessage,
          messages,
          hidden,
          ragHidden,
          ragIndexId,
          showCreator,
        })
        enqueueSnackbar(t('prompt:updatedPrompt', { name }), { variant: 'success' })
        onDone(editedPrompt ?? undefined)
      } else {
        const newPrompt = await createPromptMutation({
          name,
          type,
          userInstructions,
          ...(type === 'CHAT_INSTANCE' ? { chatInstanceId: chatInstance?.id } : {}),
          systemMessage,
          messages,
          hidden,
          ragHidden,
          ragIndexId,
          showCreator,
        })
        enqueueSnackbar(t('prompt:createdPrompt', { name }), { variant: 'success' })
        onDone(newPrompt ?? undefined)
      }
      clearCachedForm()
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const context: PromptEditorFormContextValue = {
    form,
    setForm,
    type,
    ragIndices,
    userRagIndices,
    courseId,
    editingPromptId: previewPrompt?.id,
    editingPromptTab: type === 'CHAT_INSTANCE' ? 0 : 1,
  }

  return (
    <PromptEditorFormContext.Provider value={context}>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ py: 0 }}>
            <PromptEditorForm />
          </Box>

          <DialogActions>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              {loading && <CircularProgress color="secondary" />}
              <OutlineButtonBlue
                type="button"
                onClick={() => {
                  clearCachedForm()
                  onDone()
                }}
              >
                {t('common:cancel')}
              </OutlineButtonBlue>
              <BlueButton disabled={loading} type="submit" variant="contained" sx={{ ml: 1 }}>
                {t('common:save')}
              </BlueButton>
            </Box>
          </DialogActions>
        </form>
      </Box>
    </PromptEditorFormContext.Provider>
  )
}
