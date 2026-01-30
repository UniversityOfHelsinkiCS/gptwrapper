import { Checkbox, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Button, DialogContentText, Box, RadioGroup, Radio } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { BlueButton } from './general/Buttons'
import { useState } from 'react'
import { NewConversationConfirmConfigurator, useNewConversationConfirmMutation } from '../Settings/NewConversationConfirmConfigurator'
import useCurrentUser from '../../hooks/useCurrentUser'

export const ResetConfirmModal = ({
  open, setOpen, onConfirm
}: {
  open: boolean
  setOpen: (open: boolean) => void
  onConfirm: (data: { sendEmail: boolean; downloadFile: boolean; downloadFormat: 'md' | 'docx' | 'pdf' | 'txt' }) => void
}) => {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const setSkipConfirmMutation = useNewConversationConfirmMutation('chat')
  const [skipConfirm, setSkipConfirm] = useState(user?.preferences?.skipNewConversationConfirm ?? false)
  const [sendEmail, setSendEmail] = useState(false)
  const [downloadFile, setDownloadFile] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<'md' | 'docx' | 'pdf' | 'txt'>('md')

  const handleConfirm = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    onConfirm({ sendEmail, downloadFile, downloadFormat })
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
        <Box display="flex" flexDirection="column" gap={1}>
          <FormControlLabel
            control={<Checkbox checked={sendEmail} onChange={(ev) => setSendEmail(ev.target.checked)} data-testid="send-email" />}
            label={t('email:save')}
          />
          <FormControlLabel
            control={<Checkbox checked={downloadFile} onChange={(ev) => setDownloadFile(ev.target.checked)} data-testid="download-file" />}
            label={t('download:save')}
          />
          {downloadFile && (
            <Box ml={4}>
              <RadioGroup value={downloadFormat} onChange={(ev) => setDownloadFormat(ev.target.value as 'md' | 'docx' | 'pdf' | 'txt')}>
                <FormControlLabel value="md" control={<Radio size="small" />} label={t('download:formatMarkdown')} />
                <FormControlLabel value="docx" control={<Radio size="small" />} label={t('download:formatDocx')} />
                <FormControlLabel value="pdf" control={<Radio size="small" />} label={t('download:formatPdf')} />
                <FormControlLabel value="txt" control={<Radio size="small" />} label={t('download:formatText')} />
              </RadioGroup>
            </Box>
          )}
        </Box>
        <NewConversationConfirmConfigurator label={t('preferences:newConversationConfirmLabelChat')} value={skipConfirm} setValue={setSkipConfirm} context='chat' />
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
