import { Box, Modal } from '@mui/material'
import React from 'react'
import { TextButton } from './general/Buttons'
import CloseIcon from '@mui/icons-material/Close'
import { useNavigate } from 'react-router-dom'

const TemplateModal: React.FC<{ open: boolean, root: string, children: React.ReactNode }> = ({ open, root, children }) => {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate(root)
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
          overflow: 'auto',
          borderRadius: '0.5rem'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'right',
            p: '1rem',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 999,
          }}
        >
          <TextButton data-testid="close-modal" onClick={handleClose} >
            <CloseIcon />
          </TextButton>
        </Box>
        <Box sx={{ p: '0 2rem 2rem 2rem' }}>
          {children}
        </Box>
      </Box>
    </Modal>
  )
}

export default TemplateModal
