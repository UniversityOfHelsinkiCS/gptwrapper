import { Close } from '@mui/icons-material'
import { Box, IconButton, Modal, Typography } from '@mui/material'
import ModelSelector from './ModelSelector'
import { validModels } from '../../../config'
import React from 'react'

interface SettingsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  model: string
  setModel: (model: string) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, setOpen, model, setModel }) => {
  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '85vw',
          minHeight: '70vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}
      >
        <IconButton onClick={() => setOpen(false)} sx={{ position: 'absolute', top: 8, right: 8, color: 'grey.500' }}>
          <Close />
        </IconButton>
        <Typography id="modal-title" variant="h6" component="h2">
          Settings
        </Typography>
        <ModelSelector currentModel={model} setModel={setModel} models={validModels.map(m => m.name)} />
      </Box>
    </Modal>
  )
}
