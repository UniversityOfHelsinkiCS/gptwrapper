import { Box, Modal, Typography } from '@mui/material'
import React from 'react'
import { TextButton } from './general/Buttons'
import CloseIcon from '@mui/icons-material/Close'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const ModalTitle = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const url = location.pathname

  const titleMap = {
    '/courses': t('sidebar:courseChange'),
    '/course': t('sidebar:courseSettings'),
    '/prompts': t('sidebar:promptSelect'),
    '/prompt': t('sidebar:promptEdit'),
    '/show': t('sidebar:promptDetails'),
  }

  const matchedKey = Object.keys(titleMap).find(key => url.includes(key))
  return matchedKey ? titleMap[matchedKey] : ''
}

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
          maxWidth: 1200,
          minHeight: '85vh',
          maxHeight: '85vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          overflow: 'auto',
          borderRadius: '0.5rem'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: '1rem',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 999,
          }}
        >
          <Typography variant='h6'><ModalTitle /></Typography>
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
