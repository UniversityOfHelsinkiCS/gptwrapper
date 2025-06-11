import { useEffect, useState } from 'react'
import { Close } from '@mui/icons-material'
import { Box, IconButton, Modal, Slider, TextField, Typography } from '@mui/material'
import { DEFAULT_MODEL, DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL_TEMPERATURE } from '../../../config'
import { Prompt, Course } from '../../types'
// import ModelSelector from './ModelSelector'
// import { validModels } from '../../../config'
// import RagSelector from './RagSelector'
import { RagIndexAttributes } from '../../../shared/types'
import SettingsButton from './generics/SettingsButton'
import PromptSelector from './PromptSelector'

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
  const [activePromptId, setActivePromptId] = useState<string>('')
  const [hasPrompts, setHasPrompts] = useState<boolean>(false)

  const resetSettings = () => {
    setAssistantInstructions(DEFAULT_ASSISTANT_INSTRUCTIONS)
    setModelTemperature(DEFAULT_MODEL_TEMPERATURE)
  }

  console.log('SettingsModal course:', course)

  // const activePrompt = (course?.prompts ?? []).find(({ id }) => id === activePromptId)

  const handleChangePrompt = (promptId: string) => {
    const { systemMessage, messages: promptMessages } = course?.prompts.find(({ id }) => id === promptId) as Prompt

    // setSystem(systemMessage)
    // setMessages(promptMessages)
    console.log('Prompt changed:', promptId, systemMessage, promptMessages)
    setActivePromptId(promptId)
  }

  useEffect(() => {
    if (course && course.prompts.length > 0) {
      setHasPrompts(true)
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
            Keskustelun alustus
          </Typography>
          <Typography variant="body1">
            Alustuksella tarkoitetaan yleistason ohjeistusta keskustelulle. Kielimallia voi esimerkiksi pyytää käyttämään akateemista kieltä tai esittämään puutarhuria
            jota haastatellaan kaktusten hoidosta.
          </Typography>

          {hasPrompts && course && <PromptSelector prompts={course.prompts} activePrompt={activePromptId} setActivePrompt={handleChangePrompt} />}

          <TextField
            multiline
            minRows={6}
            maxRows={10}
            label="Alustuksen sisältö"
            value={assistantInstructions}
            onChange={(e) => setAssistantInstructions(e.target.value)}
          />

          <Typography variant="h6" fontWeight={600} mt="2rem">
            Säädä kielimallin tarkkuutta
          </Typography>
          <Typography variant="body1">
            Suuremmat arvot, kuten 0.8, tekevät tulosteesta satunnaisemman, kun taas pienemmät arvot, kuten 0.2, tekevät siitä tarkemman ja deterministisemmän.
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
              <Typography>Tarkempi</Typography>
              <Typography>Satunnainen</Typography>
            </Box>
          </Box>

          {/* Disabled for now due to RAG not functioning cirreclty */}
          {/* <RagSelector currentRagIndex={currentRagIndex} setRagIndex={setRagIndex} ragIndices={ragIndices} /> */}
        </Box>

        <Box sx={{ padding: '2rem 3rem', display: 'flex', justifyContent: 'flex-end' }}>
          <SettingsButton onClick={resetSettings}>Palauta oletusasetukset</SettingsButton>
        </Box>
      </Box>
    </Modal>
  )
}
