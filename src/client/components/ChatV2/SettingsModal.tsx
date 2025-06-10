import { Close } from '@mui/icons-material'
import { Box, IconButton, Modal, Slider, TextField, Typography } from '@mui/material'
import { DEFAULT_MODEL, DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL_TEMPERATURE } from '../../../config'
import ModelSelector from './ModelSelector'
import { validModels } from '../../../config'
import React from 'react'
import RagSelector from './RagSelector'
import { RagIndexAttributes } from '../../../shared/types'
import SettingsButton from './generics/SettingsButton'

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
  setRagIndex,
  ragIndices,
  currentRagIndex,
}) => {
  const resetSettings = () => {
    setAssistantInstructions(DEFAULT_ASSISTANT_INSTRUCTIONS)
    setModelTemperature(DEFAULT_MODEL_TEMPERATURE)
  }

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
          <Box sx={{ border: '1px solid rgba(0,0,0,0.225)', borderRadius: '6px', maxWidth: 500, padding: '2rem' }}>
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

          {/* <ModelSelector currentModel={model} setModel={setModel} models={validModels.map((m) => m.name)} /> */}
          {/* Disabled for now due to RAG not functioning cirreclty */}
          {/* <RagSelector currentRagIndex={currentRagIndex} setRagIndex={setRagIndex} ragIndices={ragIndices} /> */}
        </Box>

        <Box sx={{ padding: '2rem 3rem', display: 'flex', borderTop: '1px solid rgba(0,0,0,0.25)', justifyContent: 'flex-end' }}>
          <SettingsButton onClick={resetSettings}>Palauta oletusasetukset</SettingsButton>
        </Box>
      </Box>
    </Modal>
  )
}
