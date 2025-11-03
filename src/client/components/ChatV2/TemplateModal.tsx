import { Box, Modal, Typography } from '@mui/material'
import React from 'react'
import { TextButton } from './general/Buttons'
import CloseIcon from '@mui/icons-material/Close'
import { ModalMap } from 'src/client/types'

export default function ModalTemplate({
  open,
  setOpen,
  modalsRegister,
  modalContentId,
  setModalContentId,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  modalsRegister: ModalMap
  modalContentId: string | null
  setModalContentId: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const entry = modalContentId ? modalsRegister[modalContentId] : null
  if (!modalContentId || !entry) return null

  const { name, component: Component, props = {} } = entry

  const handleClose = () => {
    setOpen(false)
    setModalContentId(null)
  }

  const handleNextModal = (modalId: string) => {
    setModalContentId(modalId)
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
          width: { xs: '100vw', md: '90vw', lg: '75vw' },
          minHeight: '80vh',
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: '0.5rem',
          overflow: 'auto',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: '2rem',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 999,
          }}
        >
          <Typography variant="h5">{name}</Typography>
          <TextButton onClick={handleClose}>
            <CloseIcon />
          </TextButton>
        </Box>

        <Box sx={{ p: '0 2rem 2rem 2rem' }}>
          <Component {...props} closeModal={handleClose} nextModal={handleNextModal} />
        </Box>
      </Box>
    </Modal>
  )
}
