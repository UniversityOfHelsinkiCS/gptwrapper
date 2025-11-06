import { Box, Modal, Typography } from '@mui/material'
import React from 'react'
import { TextButton } from './general/Buttons'
import CloseIcon from '@mui/icons-material/Close'
import { ModalMap } from 'src/client/types'
import { Link, Outlet, useNavigate } from 'react-router-dom'

const TemplateModal: React.FC<{ title: string, open: boolean, root: string, children: React.ReactNode }> = ({ title, open, root, children }) => {
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
          <Typography variant="h5">{title}</Typography>
          <TextButton onClick={handleClose} >
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
