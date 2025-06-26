import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Prompt } from '../../types'

type SaveMyPromptModalProps = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  systemMessage: string
  existingName?: string
  myPrompts: Prompt[]
  onSave: (name: string, isNewPrompt: boolean) => Promise<void>
}

export const SaveMyPromptModal = ({ isOpen, setIsOpen, onSave, systemMessage, existingName, myPrompts }: SaveMyPromptModalProps) => {
  const [name, setName] = useState(existingName ?? '')
  const { t } = useTranslation()

  useEffect(() => {
    setName(existingName ?? '')
  }, [existingName])

  const isNewPrompt = myPrompts.every((prompt) => prompt.name !== name)

  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
      <form
        onSubmit={async (e) => {
          console.log('Saving', name)
          e.preventDefault()
          await onSave(name, isNewPrompt)
          setIsOpen(false)
        }}
      >
        <DialogTitle>{t('settings:saveMyPromptModalTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            slotProps={{ htmlInput: { minLength: 1 } }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            label={t('settings:saveMyPromptAs')}
            fullWidth
            sx={{ mt: 1 }}
          />
          <Typography sx={{ mt: 2 }} variant="body2" color="textSecondary">
            {systemMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="primary" type="submit" disabled={!name}>
            {isNewPrompt ? t('settings:saveNewPrompt') : t('settings:updatePrompt')}
          </Button>
          <Button color="secondary" type="button" onClick={() => setIsOpen(false)}>
            {t('common:cancel')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
