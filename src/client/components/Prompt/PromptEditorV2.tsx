import { Box, CircularProgress, DialogActions, FormControlLabel, Switch, Typography } from '@mui/material'
import type { Message } from '@shared/chat'
import { isPromptDraft, isPromptTextTooLong, PROMPT_TEXT_MAX_LENGTH } from '@shared/prompt'
import { enqueueSnackbar } from '../common/Snackbar'
import { FormError, focusFirstInvalidField, useFormError } from '../common/accessibility/FormError'
import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import useCourse from '../../hooks/useCourse'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { getApiErrorMessage } from '../../util/apiClient'
import { useCourseRagIndices, useRagIndices } from '../../hooks/useRagIndices'
import { BlueButton, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { usePromptState } from '../ChatV2/PromptState'
import { PromptEditorFormContext, usePromptEditorState } from './context'
import { PromptEditorForm } from './PromptEditorForm'
import { Prompt, PromptEditorFormContextValue, PromptEditorFormState } from 'src/client/types'
import { switchFocusIndicatorStyle } from 'src/client/util/accessibility'
import safeLocalStorage from '../../util/safeLocalStorage'

export const PromptEditorV2 = ({
  personal,
  previewPrompt,
  onDone,
  courseId,
}: {
  personal?: boolean
  previewPrompt?: any
  onDone: (prompt?: Prompt) => void
  courseId: string
}) => {
  const { t } = useTranslation()
  const { data: chatInstance } = useCourse(courseId)

  const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)
  const { ragIndices: userRagIndices } = useRagIndices()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useFormError()

  const [rejectedNames, setRejectedNames] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const publishedLabelId = useId()
  const { createPromptMutation, editPromptMutation, myPrompts } = usePromptState()

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
    ragIndexId: previewPrompt?.ragIndexId ?? null,
    userId: previewPrompt?.userId ?? null,
    published: previewPrompt ? !isPromptDraft(previewPrompt) : false,
    tools: previewPrompt?.tools ?? [],
  }

  const cacheKey = `promptEditorForm:${previewPrompt ? `edit:${previewPrompt.id}` : `new:${type}:${courseId}`}`
  const [form, setForm] = useLocalStorageState<PromptEditorFormState>(cacheKey, initialForm)

  const existingPrompts = type === 'PERSONAL' ? myPrompts : chatInstance?.prompts ?? []
  const nameTaken = rejectedNames.includes(form.name) || existingPrompts.some((prompt) => prompt.name === form.name && prompt.id !== previewPrompt?.id)

  const clearCachedForm = () => {
    safeLocalStorage.removeItem(cacheKey)
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
    setError(null)

    let validationError: string | null = null
    if (!form.name) validationError = t('prompt:missingPromptName')
    else if (nameTaken) validationError = t('prompt:nameTaken')
    else if (isPromptTextTooLong(form.systemMessage) || isPromptTextTooLong(form.userInstructions))
      validationError = t('prompt:textTooLong', { max: PROMPT_TEXT_MAX_LENGTH })

    if (validationError) {
      if (!focusFirstInvalidField(event.currentTarget)) setError(validationError)
      return
    }

    setLoading(true)

    const { name, userInstructions, systemMessage, ragSystemMessages, hidden, ragHidden, ragIndexId, published, tools = [] } = form
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
          tools,
          ...(type === 'CHAT_INSTANCE' ? { published } : {}),
        })
        enqueueSnackbar(t('prompt:updatedPrompt', { name }), { variant: 'success' })
        clearCachedForm()
        setHasChanges(false)
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
          tools,
          ...(type === 'CHAT_INSTANCE' ? { published } : {}),
        })
        enqueueSnackbar(t('prompt:createdPrompt', { name }), { variant: 'success' })
        clearCachedForm()
        setHasChanges(false)
        onDone(newPrompt ?? undefined)
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const formElement = formRef.current
        flushSync(() => setRejectedNames((prev) => [...prev, name]))
        focusFirstInvalidField(formElement)
        return
      }
      setError(getApiErrorMessage(err) ?? t('error:unexpected'))
    } finally {
      setLoading(false)
    }
  }

  const context: PromptEditorFormContextValue = {
    form,
    initialTools: initialForm.tools ?? [],
    setForm,
    type,
    ragIndices,
    userRagIndices,
    courseId,
    nameTaken,
  }

  return (
    <PromptEditorFormContext.Provider value={context}>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <form ref={formRef} onSubmit={handleSubmit}>
          <Box sx={{ py: 0 }}>
            <PromptEditorForm />
          </Box>

          <FormError error={error} sx={{ mt: 2 }} />

          <DialogActions sx={{ flexWrap: 'wrap', gap: 2 }}>
            {type === 'CHAT_INSTANCE' && (
              <Box sx={{ mr: 'auto', mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.published}
                      onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                      slotProps={{ input: { 'aria-labelledby': publishedLabelId, 'aria-describedby': `${publishedLabelId}-help` } }}
                      sx={{ ...switchFocusIndicatorStyle }}
                      data-testid="prompt-published-switch"
                    />
                  }
                  label={<span id={publishedLabelId}>{t('uniPrompts:published')}</span>}
                />
                <Typography id={`${publishedLabelId}-help`} variant="body2" color="text.secondary">
                  {t('prompt:publishedHelp')}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, ml: 'auto' }}>
              {loading && <CircularProgress color="secondary" aria-label={t('accessibility:loading')} />}
              <OutlineButtonBlue
                type="button"
                onClick={() => {
                  clearCachedForm()
                  onDone(previewPrompt)
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
