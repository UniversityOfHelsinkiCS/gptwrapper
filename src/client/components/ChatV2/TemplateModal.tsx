import { Box, Divider, Modal, Typography } from '@mui/material'
import React from 'react'
import { TextButton } from './general/Buttons'
import CloseIcon from '@mui/icons-material/Close'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePromptEditorState } from '../Prompt/context'

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
    '/userrags': t('course:userSourceMaterials'),
  }

  const matchedKey = Object.keys(titleMap).find((key) => url.includes(key))
  return matchedKey ? titleMap[matchedKey] : ''
}

const TemplateModal: React.FC<{ open: boolean; root: string; children: React.ReactNode }> = ({ open, root, children }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { hasChanges, setHasChanges, cacheKey, setCacheKey } = usePromptEditorState()

  const handleClose = () => {
    if (hasChanges) {
      const shouldClose = window.confirm(t('prompt:unSavedChanges'))

      if (!shouldClose) return

      setHasChanges(false)
      localStorage.removeItem(cacheKey)
      setCacheKey('')
    }

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
          width: { xs: '99vw', md: '90vw', lg: '75vw' },
          maxWidth: 1400,
          minHeight: '85vh',
          maxHeight: '85vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          overflow: 'auto',
          borderRadius: '0.5rem',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            p: '1rem',
            position: 'sticky',
            top: 0,
            zIndex: 999,
            bgcolor: 'background.subtle',
          }}
        >
          <Typography variant="h6">
            <ModalTitle />
          </Typography>
          <TextButton data-testid="close-modal" onClick={handleClose}>
            <CloseIcon />
          </TextButton>
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', p: '0 1rem 1rem 1rem', flex: '1', overflow: 'hidden' }}>{children}</Box>
      </Box>
    </Modal>
  )
}

export default TemplateModal
