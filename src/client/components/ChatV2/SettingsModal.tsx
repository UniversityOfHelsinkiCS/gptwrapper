import { Close } from '@mui/icons-material'
import { Box, Button, IconButton, Modal, Slider, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE } from '../../../config'
// import ModelSelector from './ModelSelector'
// import { validModels } from '../../../config'
// import RagSelector from './RagSelector'
import type { RagIndexAttributes } from '../../../shared/types'
import type { Course, Prompt } from '../../types'
import AssistantInstructionsInput from './AssistantInstructionsInput'
import SettingsButton from './generics/SettingsButton'
import PromptSelector from './PromptSelector'
import RagSelector from './RagSelector'
import { SaveMyPromptModal } from './SaveMyPromptModal'
import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import { useSearchParams } from 'react-router-dom'

const useUrlPromptId = () => {
  const [searchParams] = useSearchParams()
  const promptId = searchParams.get('promptId')
  return promptId
}

interface SettingsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  assistantInstructions: string
  setAssistantInstructions: (instructions: string) => void
  modelTemperature: number
  setModelTemperature: (value: number) => void
  model: string
  setModel: (model: string) => void
  showRagSelector: boolean
  setRagIndex: (ragIndex: number) => void
  ragIndices?: RagIndexAttributes[]
  currentRagIndex?: RagIndexAttributes
  course?: Course
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  setOpen,
  assistantInstructions,
  setAssistantInstructions,
  modelTemperature,
  setModelTemperature,
  model,
  setModel,
  showRagSelector,
  setRagIndex,
  ragIndices,
  currentRagIndex,
  course,
}) => {
  const urlPromptId = useUrlPromptId()
  const { t } = useTranslation()

  const { data: myPrompts, refetch } = useQuery<Prompt[]>({
    queryKey: ['/prompts/my-prompts'],
    initialData: [],
  })
  const promptSaveMutation = useMutation({
    mutationFn: async ({ name, promptToSave }: { name: string; promptToSave?: Prompt }) => {
      const promptData = {
        name,
        systemMessage: assistantInstructions,
        type: 'PERSONAL',
      }
      if (promptToSave) {
        const res = await apiClient.put<Prompt>(`/prompts/${promptToSave.id}`, promptData)
        setActivePrompt(res.data)
      } else {
        const res = await apiClient.post<Prompt>('/prompts', promptData)
        setActivePrompt(res.data)
      }
      refetch()
    },
  })
  const promptDeleteMutation = useMutation({
    mutationFn: async (prompt: Prompt) => {
      await apiClient.delete(`/prompts/${prompt.id}`)
      refetch()
    },
  })
  const [activePrompt, setActivePrompt] = useState<Prompt>()
  const [myPromptModalOpen, setMyPromptModalOpen] = useState<boolean>(false)
  const mandatoryPrompt = course?.prompts.find((p) => p.mandatory)
  const urlPrompt = course?.prompts.find((p) => p.id === urlPromptId)
  const isPromptHidden = activePrompt?.hidden ?? false
  const isPromptEditable = activePrompt?.type !== 'CHAT_INSTANCE' && activePrompt?.type !== 'RAG_INDEX'

  const resetSettings = () => {
    handleChangePrompt(undefined)
    setModelTemperature(DEFAULT_MODEL_TEMPERATURE)
  }

  const handleChangePrompt = (newPrompt: Prompt | undefined) => {
    if (!newPrompt) {
      console.log('Setting default prompt')
      setActivePrompt(undefined)
      setAssistantInstructions(DEFAULT_ASSISTANT_INSTRUCTIONS)
      return
    }

    setAssistantInstructions(newPrompt.systemMessage)
    setActivePrompt(newPrompt)
  }

  useEffect(() => {
    if (mandatoryPrompt) {
      handleChangePrompt(mandatoryPrompt)
    } else if (urlPrompt) {
      console.log(`Using promptId=${urlPrompt.id} defined by URL search param`)
      handleChangePrompt(urlPrompt)
    }
  }, [mandatoryPrompt, urlPrompt])

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 600,
          width: '85vw',
          maxWidth: 1000,
          minHeight: '80vh',
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: '0.3rem',
          overflow: 'hidden',
        }}
      >
        <IconButton onClick={() => setOpen(false)} sx={{ position: 'absolute', top: 10, right: 20, color: 'grey.500' }}>
          <Close />
        </IconButton>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '1.2rem',
            overflowY: 'auto',
            p: '3rem',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {t('settings:prompt')}
          </Typography>
          <Typography variant="body1">{t('settings:promptInstructions')}</Typography>
          <PromptSelector
            coursePrompts={course?.prompts ?? []}
            myPrompts={myPrompts}
            activePrompt={activePrompt}
            setActivePrompt={handleChangePrompt}
            handleDeletePrompt={(prompt) => promptDeleteMutation.mutateAsync(prompt)}
            mandatoryPrompt={mandatoryPrompt}
            urlPrompt={urlPrompt}
          />
          <AssistantInstructionsInput
            label={t('settings:promptContent')}
            disabled={!isPromptEditable}
            hidden={isPromptHidden}
            instructions={assistantInstructions}
            setInstructions={setAssistantInstructions}
          />
          {!isPromptHidden && <Button onClick={() => setMyPromptModalOpen(true)}>{t('settings:saveMyPrompt')}</Button>}

          <Typography variant="h6" fontWeight={600} mt="2rem">
            {t('settings:temperature')}
          </Typography>
          <Typography variant="body1">{t('settings:temperatureInstructions')}</Typography>
          <Box sx={{ maxWidth: 400, padding: '1.5rem 0' }}>
            <Slider
              min={0.0}
              max={1.0}
              step={0.1}
              value={modelTemperature}
              marks
              valueLabelDisplay="auto"
              onChange={(_event, value) => setModelTemperature(typeof value === 'number' ? value : modelTemperature)}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>{t('settings:temperatureAccurate')}</Typography>
              <Typography>{t('settings:temperatureRandom')}</Typography>
            </Box>
          </Box>

          {course && showRagSelector && (
            <>
              <Typography variant="h6" mb={'0.5rem'} fontWeight="bold">
                {t('settings:courseMaterials')}
              </Typography>
              <RagSelector currentRagIndex={currentRagIndex} setRagIndex={setRagIndex} ragIndices={ragIndices ?? []} />
            </>
          )}
        </Box>

        <Box
          sx={{
            padding: '2rem 3rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <SettingsButton onClick={resetSettings}>{t('settings:resetDefault')}</SettingsButton>
          <SettingsButton onClick={() => setOpen(false)}>{t('common:close')}</SettingsButton>
        </Box>
        <SaveMyPromptModal
          isOpen={myPromptModalOpen}
          setIsOpen={setMyPromptModalOpen}
          systemMessage={assistantInstructions}
          myPrompts={myPrompts}
          existingName={activePrompt?.name}
          onSave={async (name, promptToSave) => {
            await promptSaveMutation.mutateAsync({ name, promptToSave })
          }}
        />
      </Box>
    </Modal>
  )
}
