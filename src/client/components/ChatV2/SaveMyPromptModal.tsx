import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Prompt } from '../../types'
import { BlueButton, OutlineButtonBlack } from './general/Buttons'

type SaveMyPromptModalProps = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  systemMessage: string
  existingName?: string
  myPrompts: Prompt[]
  onSave: (name: string, promptToSave: Prompt | undefined) => Promise<void>
}

export const SaveMyPromptModal = ({ isOpen, setIsOpen, onSave, systemMessage, existingName, myPrompts }: SaveMyPromptModalProps) => {
  const [name, setName] = useState(existingName ?? '')
  const { t } = useTranslation()

  useEffect(() => {
    setName(existingName ?? '')
  }, [existingName])

  const promptToSave = myPrompts.find((prompt) => prompt.name === name)

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      maxWidth="md"
      sx={{ '& .MuiDialog-paper': { width: '100%', minWidth: { xs: '90%', sm: 450, md: 600 } } }}
    >
      <form
        onSubmit={async (e) => {
          console.log('Saving', name)
          e.preventDefault()
          await onSave(name, promptToSave)
          setIsOpen(false)
        }}
        style={{ padding: 8 }}
      >
        <DialogTitle>{t('settings:saveMyPromptModalTitle')}</DialogTitle>
        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'flex-start' }}>
          <TextField
            slotProps={{ htmlInput: { minLength: 1 } }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            label={t('settings:saveMyPromptAs')}
            fullWidth
            sx={{ mt: 1 }}
          />
          <Typography sx={{ mt: 2, textAlign: 'flex-start', width: '100%', fontStyle: 'italic' }} variant="body2" color="textSecondary">
            "{systemMessage}"
          </Typography>
        </DialogContent>
        <DialogActions>
          <OutlineButtonBlack type="button" onClick={() => setIsOpen(false)}>
            {t('common:cancel')}
          </OutlineButtonBlack>
          <BlueButton type="submit" disabled={!name}>
            {promptToSave ? t('settings:updatePrompt') : t('settings:saveNewPrompt')}
          </BlueButton>
        </DialogActions>
      </form>
    </Dialog>
  )
}
