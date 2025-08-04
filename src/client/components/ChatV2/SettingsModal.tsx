import { Add, Close } from '@mui/icons-material'
import { Box, IconButton, Modal, Slider, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL_TEMPERATURE } from '../../../config'
import type { RagIndexAttributes } from '../../../shared/types'
import type { Course, Prompt } from '../../types'
import AssistantInstructionsInput from './AssistantInstructionsInput'
import PromptSelector from './PromptSelector'
import { SaveMyPromptModal } from './SaveMyPromptModal'
import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import { useSearchParams } from 'react-router-dom'
import { BlueButton, OutlineButtonBlack } from './generics/Buttons'
import { useAnalyticsDispatch } from '../../stores/analytics'
import useLocalStorageState from '../../hooks/useLocalStorageState'

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
  setRagIndex: (ragIndex: number | undefined) => void
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
  course,
}) => {
  const urlPromptId = useUrlPromptId()
  const { t } = useTranslation()

  const { data: myPrompts, refetch } = useQuery<Prompt[]>({
    queryKey: ['/prompts/my-prompts'],
    initialData: [],
  })
  const instructionsInputFieldRef = useRef<HTMLInputElement>(null)
  const promptSaveMutation = useMutation({
    mutationFn: async ({ name, promptToSave }: { name: string; promptToSave?: Prompt }) => {
      const promtMessage = instructionsInputFieldRef?.current ? instructionsInputFieldRef.current.value : ''
      const promptData = {
        name,
        systemMessage: promtMessage,
        type: 'PERSONAL',
      }
      setAssistantInstructions(promtMessage) //<--- makes sure the defaultValue of promt content matches the new saved promt
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
  //local storage prompt prevents the annoying case where the user refreshes the page and the chosen prompt is reset to default, and the textbox displays incorrect prompt information
  const [localStoragePrompt, setLocalStoragePrompt] = useLocalStorageState<Prompt | undefined>('prompt', undefined)
  const [activePrompt, setActivePrompt] = useState<Prompt | undefined>(localStoragePrompt)
  const [myPromptModalOpen, setMyPromptModalOpen] = useState<boolean>(false)
  const mandatoryPrompt = course?.prompts.find((p) => p.mandatory)
  const urlPrompt = course?.prompts.find((p) => p.id === urlPromptId)
  const isPromptHidden = activePrompt?.hidden ?? false
  const isPromptEditable = activePrompt?.type !== 'CHAT_INSTANCE' && activePrompt?.type !== 'RAG_INDEX'
  const dispatchAnalytics = useAnalyticsDispatch()
  useEffect(() => {
    dispatchAnalytics({
      type: 'SET_ANALYTICS_DATA',
      payload: {
        promptId: activePrompt?.id,
        promptName: activePrompt?.name,
      },
    })
  }, [activePrompt?.id, dispatchAnalytics])

  const resetSettings = () => {
    handleChangePrompt(undefined)
    setModelTemperature(DEFAULT_MODEL_TEMPERATURE)
  }

  const handleChangePrompt = (newPrompt: Prompt | undefined) => {
    if (!newPrompt) {
      console.log('Setting default prompt')
      setActivePrompt(undefined)
      setLocalStoragePrompt(undefined)
      setAssistantInstructions(DEFAULT_ASSISTANT_INSTRUCTIONS)
      return
    }

    setAssistantInstructions(newPrompt.systemMessage)
    setActivePrompt(newPrompt)
    setLocalStoragePrompt(newPrompt)
  }

  useEffect(() => {
    if (mandatoryPrompt) {
      handleChangePrompt(mandatoryPrompt)
    } else if (urlPrompt) {
      console.log(`Using promptId=${urlPrompt.id} defined by URL search param`)
      handleChangePrompt(urlPrompt)
    }
  }, [mandatoryPrompt, urlPrompt])
  const handleClose = async () => {
    //handles if the user wants to update current promts
    if (activePrompt) {
      console.log('updating active promt')
      await promptSaveMutation.mutateAsync({ name: activePrompt.name, promptToSave: activePrompt })
    }
    //default promt is not a saved promt so this handles the change to it
    else if (instructionsInputFieldRef.current) {
      setAssistantInstructions(instructionsInputFieldRef.current.value)
    }
    setOpen(false)
  }
  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          // minWidth: 600,
          width: '85vw',
          maxWidth: 1000,
          minHeight: '25vh',
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: '0.3rem',
          overflow: 'auto',
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', top: 10, right: 20, color: 'grey.500', background: '#FFF', opacity: 0.9, zIndex: 1 }}
          id="close-settings"
        >
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
            p: { xs: '1.5rem', md: '3rem' },
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
            instructionsInputFieldRef={instructionsInputFieldRef}
          />
          {!isPromptHidden && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <OutlineButtonBlack startIcon={<Add />} onClick={() => setMyPromptModalOpen(true)}>
                {t('settings:saveMyPrompt')}
              </OutlineButtonBlack>
            </Box>
          )}

          <Typography variant="h6" fontWeight={600} mt="2rem">
            {t('settings:temperature')}
          </Typography>
          <Typography variant="body1">{t('settings:temperatureInstructions')}</Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ padding: '1.5rem 0', width: '100%', maxWidth: 600 }}>
              <Slider
                sx={{ width: '100%' }}
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
          </Box>
        </Box>

        <Box
          sx={{
            padding: { xs: '1rem', md: '2rem' },
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <OutlineButtonBlack
            onClick={() => {
              if (window.confirm(t('settings:resetConfirm'))) {
                resetSettings()
              }
            }}
          >
            {t('settings:resetDefault')}
          </OutlineButtonBlack>{' '}
          <BlueButton onClick={handleClose}>OK</BlueButton>
        </Box>
        <SaveMyPromptModal
          isOpen={myPromptModalOpen}
          setIsOpen={setMyPromptModalOpen}
          systemMessage={instructionsInputFieldRef.current ? instructionsInputFieldRef.current.value : ''}
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
