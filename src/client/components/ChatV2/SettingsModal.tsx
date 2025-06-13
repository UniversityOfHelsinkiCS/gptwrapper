import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Close } from '@mui/icons-material'
import { Box, IconButton, Modal, Slider, Typography } from '@mui/material'
import { DEFAULT_MODEL, DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL_TEMPERATURE } from '../../../config'
import { Prompt, Course } from '../../types'
// import ModelSelector from './ModelSelector'
// import { validModels } from '../../../config'
// import RagSelector from './RagSelector'
import { RagIndexAttributes } from '../../../shared/types'
import SettingsButton from './generics/SettingsButton'
import PromptSelector from './PromptSelector'
import AssistantInstructionsInput from './AssistantInstructionsInput'

interface SettingsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  assistantInstructions: string
  setAssistantInstructions: (instructions: string) => void
  modelTemperature: number
  setModelTemperature: (value: number) => void
  model: string
  setModel: (model: string) => void
  setRagIndex: (ragIndex: number) => void
  ragIndices: RagIndexAttributes[]
  currentRagIndex: RagIndexAttributes
  course?: Course
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  setOpen,
  assistantInstructions,
  setAssistantInstructions,
  modelTemperature,
  setModelTemperature,
  // model,
  // setModel,
  // setRagIndex,
  // ragIndices,
  // currentRagIndex,
  course,
}) => {
  const { t, i18n } = useTranslation()
  const { language } = i18n

  const [activePromptId, setActivePromptId] = useState<string>('')
  const [hasPrompts, setHasPrompts] = useState<boolean>(false)
  const [hidePrompt, setHidePrompt] = useState<boolean>(false)

  const resetSettings = () => {
    setActivePromptId('')
    setAssistantInstructions(DEFAULT_ASSISTANT_INSTRUCTIONS)
    setModelTemperature(DEFAULT_MODEL_TEMPERATURE)
    setHidePrompt(false)
  }

  const handleChangePrompt = (promptId: string) => {
    const { systemMessage } = course?.prompts.find(({ id }) => id === promptId) as Prompt

    setAssistantInstructions(systemMessage)
    setActivePromptId(promptId)
    const hidePrompt = course?.prompts.find(({ id }) => id === promptId)?.hidden ?? false
    setHidePrompt(hidePrompt)
  }

  useEffect(() => {
    // Sets to default instructions to prevent hidden prompts from showing
    // Come up with a persistant storage solution if there is a need to preserve instructions per course
    setActivePromptId('')
    setHidePrompt(false)
    setAssistantInstructions(DEFAULT_ASSISTANT_INSTRUCTIONS)

    if (course && course.prompts.length > 0) {
      setHasPrompts(true) // Show alustus select if there are prompts
    }
  }, [course])

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
            gap: '1.2rem',
            overflowY: 'auto',
            p: '3rem',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {t('settings:prompt')}
          </Typography>
          <Typography variant="body1">
            {t('settings:promptInstructions')}
          </Typography>

          {hasPrompts && <PromptSelector prompts={course.prompts} activePrompt={activePromptId} setActivePrompt={handleChangePrompt} />}
          <AssistantInstructionsInput
            label={t('settings:promptContent')}
            disabled={activePromptId.length > 0}
            hidden={hidePrompt}
            instructions={assistantInstructions}
            setInstructions={setAssistantInstructions}
          />

          <Typography variant="h6" fontWeight={600} mt="2rem">
            {t('settings:temperature')}
          </Typography>
          <Typography variant="body1">
            {t('settings:temperatureInstructions')}
          </Typography>
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

          {/* Disabled for now due to RAG not functioning cirreclty */}
          {/* <RagSelector currentRagIndex={currentRagIndex} setRagIndex={setRagIndex} ragIndices={ragIndices} /> */}
        </Box>

        <Box
          sx={{
            padding: '2rem 3rem',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <SettingsButton onClick={resetSettings}>{t('settings:resetDefault')}</SettingsButton>
        </Box>
      </Box>
    </Modal>
  )
}
