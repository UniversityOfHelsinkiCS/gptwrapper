import { Add, Close } from '@mui/icons-material'
import { Box, IconButton, Modal, Slider, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL_TEMPERATURE } from '../../../config'
import type { Course, Prompt } from '../../types'
import AssistantInstructionsInput from './AssistantInstructionsInput'
import PromptSelector from './PromptSelector'
import { SaveMyPromptModal } from './SaveMyPromptModal'
import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import { useSearchParams } from 'react-router-dom'
import { BlueButton, OutlineButtonBlack } from './general/Buttons'
import { useAnalyticsDispatch } from '../../stores/analytics'
import { isAxiosError } from 'axios'
import { SendPreferenceConfiguratorButton } from './SendPreferenceConfigurator'

export const useUrlPromptId = () => {
  const [searchParams] = useSearchParams()
  const promptId = searchParams.get('promptId')
  return promptId
}

interface SettingsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  customSystemMessage: string
  setCustomSystemMessage: (instructions: string) => void
  activePrompt: Prompt | undefined
  setActivePrompt: (prompt: Prompt | undefined) => void
  modelTemperature: number
  setModelTemperature: (value: number) => void
  course?: Course
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  setOpen,
  customSystemMessage,
  setCustomSystemMessage,
  activePrompt,
  setActivePrompt,
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
  const [systemMessage, setSystemMessage] = useState<string>(customSystemMessage)

  const ownPromptSaveMutation = useMutation({
    mutationFn: async ({ name, promptToSave }: { name: string; promptToSave?: Prompt }) => {
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
      refetch()
    },
  })

  const ownPromptDeleteMutation = useMutation({
    mutationFn: async (prompt: Prompt) => {
      if (prompt.type !== 'PERSONAL') return // Only do this for personal prompts

      await apiClient.delete(`/prompts/${prompt.id}`)
      refetch()
    },
  })

  const [myPromptModalOpen, setMyPromptModalOpen] = useState<boolean>(false)
  const mandatoryPrompt = course?.prompts.find((p) => p.mandatory)
  const urlPrompt = course?.prompts.find((p) => p.id === urlPromptId)
  const isPromptHidden = activePrompt?.hidden ?? false
  const isPromptEditable = activePrompt === undefined || activePrompt?.type === 'PERSONAL'
  const dispatchAnalytics = useAnalyticsDispatch()

  useEffect(() => {
    dispatchAnalytics({
      type: 'SET_ANALYTICS_DATA',
      payload: {
        promptId: activePrompt?.id,
        promptName: activePrompt?.name,
      },
    })

    if (activePrompt) {
      setSystemMessage(activePrompt?.systemMessage)
    }
  }, [activePrompt?.id])

  // Time for a quick sync :D --- really this is what you get when using the local storage to hold some data that is also on the server. basically having to build our own sync engine lol.
  useEffect(() => {
    // Dont sync personal prompts for now...
    if (!isPromptEditable && activePrompt) {
      const sync = async () => {
        try {
          const serverActivePrompt = await apiClient.get<Prompt>(`/prompts/${activePrompt?.id}`)
          setActivePrompt(serverActivePrompt.data)
        } catch (error) {
          if (isAxiosError(error)) {
            if (error.status === 404) {
              setActivePrompt(undefined) // The prompt has been deleted on the server.
            }
          } else {
            console.error('Unexpected error syncing prompt:', error)
          }
        }
      }
      sync()
    }
  }, [])

  const resetSettings = () => {
    handleChangePrompt(undefined)
    setSystemMessage(DEFAULT_ASSISTANT_INSTRUCTIONS)
    setModelTemperature(DEFAULT_MODEL_TEMPERATURE)
  }

  const handleChangePrompt = (newPrompt: Prompt | undefined) => {
    if (!newPrompt) {
      setActivePrompt(undefined)
      setSystemMessage(DEFAULT_ASSISTANT_INSTRUCTIONS)
      setCustomSystemMessage(DEFAULT_ASSISTANT_INSTRUCTIONS)
      return
    }

    setSystemMessage(newPrompt.systemMessage)
    setActivePrompt(newPrompt)
  }

  useEffect(() => {
    if (mandatoryPrompt) {
      handleChangePrompt(mandatoryPrompt)
    } else if (urlPrompt) {
      handleChangePrompt(urlPrompt)
    }
  }, [mandatoryPrompt, urlPrompt])

  const handleClose = async () => {
    console.log('handleClose', activePrompt, systemMessage)
    // When no prompt is selected, set the custom system message to the value of the system message textfield
    if (!activePrompt) {
      setCustomSystemMessage(systemMessage)
    } else if (activePrompt.type === 'PERSONAL') {
      await ownPromptSaveMutation.mutateAsync({ name: activePrompt.name, promptToSave: activePrompt })
    }
    setOpen(false)
  }

  return (
    <Modal open={open} onClose={handleClose} data-testid="settings-modal">
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
          data-testid="close-settings"
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
            handleDeletePrompt={(prompt) => ownPromptDeleteMutation.mutateAsync(prompt)}
            mandatoryPrompt={mandatoryPrompt}
            urlPrompt={urlPrompt}
          />
          <AssistantInstructionsInput
            label={t('settings:promptContent')}
            disabled={!isPromptEditable}
            hidden={isPromptHidden}
            systemMessage={systemMessage}
            setSystemMessage={setSystemMessage}
          />
          {!isPromptHidden && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <OutlineButtonBlack startIcon={<Add />} onClick={() => setMyPromptModalOpen(true)} data-testid="save-my-prompt-button">
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
                name="Temperature"
                onChange={(_event, value) => setModelTemperature(typeof value === 'number' ? value : modelTemperature)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>{t('settings:temperatureAccurate')}</Typography>
                <Typography>{t('settings:temperatureRandom')}</Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="h6" fontWeight={600} mt="2rem">
            {t('settings:other')}
          </Typography>
          <div>
            <SendPreferenceConfiguratorButton />
          </div>
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
          <BlueButton onClick={handleClose} data-testid="settings-ok-button">
            OK
          </BlueButton>
        </Box>
        <SaveMyPromptModal
          isOpen={myPromptModalOpen}
          setIsOpen={setMyPromptModalOpen}
          systemMessage={systemMessage}
          myPrompts={myPrompts}
          existingName={activePrompt?.name}
          onSave={async (name, promptToSave) => {
            await ownPromptSaveMutation.mutateAsync({ name, promptToSave })
          }}
        />
      </Box>
    </Modal>
  )
}
