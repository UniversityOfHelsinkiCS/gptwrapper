import { Box, DialogContent, IconButton } from '@mui/material'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import UserSearch from './UserSearch'
import { Close } from '@mui/icons-material'

export const SuperSpeedLoginAs = () => {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  // Register hotkey event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'l' && event.ctrlKey) {
        event.preventDefault()
        event.stopPropagation()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      slotProps={{
        paper: {
          sx: {
            minWidth: '50vw',
            maxWidth: '70vw',
          },
        },
      }}
      aria-labelledby="super-speed-login-dialog-title"
      aria-describedby="super-speed-login-dialog-description"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 3 }}>
        <DialogTitle id="super-speed-login-dialog-title">{t('admin:loginAsButton')}</DialogTitle>
        <IconButton onClick={() => setOpen(false)} aria-label={t('common:close')} sx={{ position: 'absolute', top: 16, right: 24 }}>
          <Close />
        </IconButton>
      </Box>
      <DialogContent
        sx={{
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        <Box
          sx={{
            width: '100%',
            overflowX: 'auto',
            '& .MuiTableContainer-root': {
              maxHeight: '52vh',
              overflow: 'auto',
            },
          }}
        >
          <UserSearch />
        </Box>
      </DialogContent>
    </Dialog>
  )
}
