import { Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Button, DialogContentText, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { BlueButton } from './general/Buttons'
import { useState } from 'react'
import { NewConversationConfirmConfiguratorSwitch, useNewConversationConfirmMutation } from '../Settings/NewConversationConfirmConfigurator'
import useCurrentUser from '../../hooks/useCurrentUser'

export const ResetConfirmModal = ({
  open, setOpen, onConfirm
}: {
  open: boolean
  setOpen: (open: boolean) => void
  onConfirm: (data: { sendEmail: boolean }) => void
}) => {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const setSkipConfirmMutation = useNewConversationConfirmMutation('chat')
  const [skipConfirm, setSkipConfirm] = useState(user?.preferences?.skipNewConversationConfirm ?? false)
  const [sendEmail, setSendEmail] = useState(false)

  const handleConfirm = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    onConfirm({ sendEmail })
    setSkipConfirmMutation(skipConfirm)
    setOpen(false)
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>{t('chat:confirmResetTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText mb={2}>
          {t('chat:confirmResetMessage')}
        </DialogContentText>
        <FormControlLabel
          control={<Checkbox checked={sendEmail} onChange={(ev) => setSendEmail(ev.target.checked)} data-testid="send-email" />}
          label={t('email:save')}
        />
        <NewConversationConfirmConfiguratorSwitch value={skipConfirm} setValue={setSkipConfirm} context='chat' />
      </DialogContent>
      <form onSubmit={handleConfirm}>
        <DialogActions>
          <Button onClick={() => setOpen(false)} data-testid="cancel-confirm-reset" variant="text">
            {t('common:cancel')}
          </Button>
          <BlueButton type="submit" data-testid="submit-confirm-reset">
            OK
          </BlueButton>
        </DialogActions>
      </form>
    </Dialog>
  )
}
