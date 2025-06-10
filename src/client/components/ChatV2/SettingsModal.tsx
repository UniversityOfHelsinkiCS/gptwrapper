import { Close } from '@mui/icons-material'
import { Box, IconButton, Modal, TextField, Typography } from '@mui/material'
import ModelSelector from './ModelSelector'
import { validModels } from '../../../config'
import React from 'react'
import RagSelector from './RagSelector'
import { RagIndexAttributes } from '../../../shared/types'

interface SettingsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  model: string
  setModel: (model: string) => void
  setRagIndex: (ragIndex: number) => void
  ragIndices: RagIndexAttributes[]
  currentRagIndex: RagIndexAttributes
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, setOpen, model, setModel, setRagIndex, ragIndices, currentRagIndex }) => {
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
          gap: '1.2rem',
          minWidth: 600,
          width: '85vw',
          maxWidth: 1000,
          minHeight: '70vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: '2.5rem',
          borderRadius: '0.3rem',
        }}
      >
        <IconButton onClick={() => setOpen(false)} sx={{ position: 'absolute', top: 8, right: 8, color: 'grey.500' }}>
          <Close />
        </IconButton>
        <Typography variant="h6" fontWeight={600}>
          Alustus
        </Typography>
        <Typography variant="body1">
          Alustuksella tarkoitetaan yleistason ohjeistusta keskustelulle. Kielimallia voi esimerkiksi pyytää käyttämään akateemista kieltä tai esittämään puutarhuria jota
          haastatellaan kaktusten hoidosta.
        </Typography>
        {/* <ModelSelector currentModel={model} setModel={setModel} models={validModels.map((m) => m.name)} /> */}
        {/* Disabled for now due to RAG not functioning cirreclty */}
        {/* <RagSelector currentRagIndex={currentRagIndex} setRagIndex={setRagIndex} ragIndices={ragIndices} /> */}
        <TextField multiline minRows={6} maxRows={10} label="Alustuksen sisältö" defaultValue="Olet avulias avustaja" />
      </Box>
    </Modal>
  )
}
