import { validModels } from '@config'
import { Box, CircularProgress, DialogActions } from '@mui/material'
import type { Message } from '@shared/chat'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import { BlueButton, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { usePromptState } from '../ChatV2/PromptState'
import { PromptEditorFormContext } from './context'
import { PromptEditorForm2 } from './PromptEditorForm2'
import { PromptEditorFormContextValue, PromptEditorFormState } from 'src/client/types'

export const PromptEditor2 = ({ personal, previewPrompt, onDone }: { personal?: boolean; previewPrompt?: any; onDone: () => void }) => {
  const { t } = useTranslation()
  const { courseId } = useParams() as { courseId: string }
  const { data: chatInstance } = useCourse(courseId)
  const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)
  const [loading, setLoading] = useState<boolean>(false)
  const { createPromptMutation, editPromptMutation } = usePromptState()

  let type: 'CHAT_INSTANCE' | 'PERSONAL' = 'CHAT_INSTANCE'
  if (courseId && courseId !== 'general') type = 'CHAT_INSTANCE'
  if (personal) type = 'PERSONAL'
  if (previewPrompt) type = previewPrompt.type

  const [form, setForm] = useState<PromptEditorFormState>({
    name: previewPrompt?.name ?? '',
    userInstructions: previewPrompt?.userInstructions ?? '',
    systemMessage: previewPrompt?.systemMessage ?? '',
    ragSystemMessage: previewPrompt
      ? (previewPrompt.messages?.find((m: Message) => m.role === 'system')?.content as string) || ''
      : t('prompt:defaultRagMessage'),
    hidden: previewPrompt?.hidden ?? false,
    ragIndexId: previewPrompt?.ragIndexId ?? null,
    selectedModel: previewPrompt?.model ?? 'none',
    temperatureDefined: previewPrompt?.temperature !== undefined,
    temperature: previewPrompt?.temperature ?? 0.5,
  })

  const modelHasTemperature = form.selectedModel && 'temperature' in (validModels.find((m) => m.name === form.selectedModel) ?? {})

  useEffect(() => {
    const selectedModelConfig = validModels.find((m) => m.name === form.selectedModel)
    if (selectedModelConfig && 'temperature' in selectedModelConfig) {
      setForm((prev) => ({
        ...prev,
        temperature: selectedModelConfig.temperature,
        temperatureDefined: false,
      }))
    }
  }, [form.selectedModel])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name) {
      enqueueSnackbar(t('prompt:missingPromptName'), { variant: 'error' })
      return
    }

    setLoading(true)

    const { name, userInstructions, systemMessage, ragSystemMessage, hidden, ragIndexId, selectedModel, temperature } = form

    const messages: Message[] = ragIndexId && ragSystemMessage.length > 0 ? [{ role: 'system', content: ragSystemMessage }] : []

    try {
      if (previewPrompt) {
        await editPromptMutation({
          id: previewPrompt.id,
          name,
          userInstructions,
          systemMessage,
          messages,
          hidden,
          ragIndexId,
          model: selectedModel,
          temperature,
        })
        enqueueSnackbar(t('prompt:updatedPrompt', { name }), { variant: 'success' })
      } else {
        await createPromptMutation({
          name,
          type,
          userInstructions,
          ...(type === 'CHAT_INSTANCE' ? { chatInstanceId: chatInstance?.id } : {}),
          systemMessage,
          messages,
          hidden,
          ragIndexId,
          model: selectedModel,
          temperature,
        })
        enqueueSnackbar(t('prompt:createdPrompt', { name }), { variant: 'success' })
      }
      onDone()
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
    courseId,
    modelHasTemperature,
  }

  return (
    <PromptEditorFormContext.Provider value={context}>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ py: 0 }}>
            <PromptEditorForm2 />
          </Box>

          <DialogActions>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              {loading && <CircularProgress color="secondary" />}
              <OutlineButtonBlue type="button" onClick={onDone}>
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
