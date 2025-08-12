import FeedbackIcon from '@mui/icons-material/Feedback'
import { Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Fab, FormControlLabel, TextField, Tooltip } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../util/apiClient'
import { addJustInTimeFields, useAnalytics } from '../stores/analytics'
import type { FeedbackPost } from '../../shared/feedback'
import { useSnackbar } from 'notistack'
import { BlueButton, OutlineButtonBlack, OutlineButtonBlue } from './ChatV2/general/Buttons'

const useSubmitFeedbackMutation = () => {
  const analyticsMetadata = useAnalytics()

  return useMutation({
    mutationFn: async ({ feedback, responseWanted }: { feedback: string; responseWanted: boolean }) => {
      const metadata = addJustInTimeFields(analyticsMetadata)
      const body: FeedbackPost = {
        feedback,
        responseWanted,
        metadata,
      }
      const res = await apiClient.post('/feedback', body)
      return res.data
    },
  })
}

export const Feedback: React.FC = () => {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [modalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [responseWanted, setResponseWanted] = useState(false)

  const submitFeedback = useSubmitFeedbackMutation()

  const handleSubmit = async () => {
    setModalOpen(false)
    try {
      await submitFeedback.mutateAsync({ feedback, responseWanted })
      enqueueSnackbar(t('feedback:success'), { variant: 'success' })
    } catch (e) {
      console.error('Error submitting feedback:', e)
      enqueueSnackbar(t('feedback:error'), { variant: 'error' })
    }
  }

  return (
    <>
      <Tooltip arrow title={t('feedback:giveFeedback')} placement="top">
        <Fab
          color="default"
          aria-label="feedback"
          sx={(theme) => ({
            position: 'fixed',
            bottom: { xs: 12, sm: 18 },
            right: { xs: 12, sm: 18 },
            zIndex: theme.zIndex.modal + 1,
            opacity: 0.9,

            transition: 'opacity 0.2s',
          })}
          onClick={() => setModalOpen(true)}
        >
          <FeedbackIcon />
        </Fab>
      </Tooltip>
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>{t('feedback:title')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('feedback:description')}</DialogContentText>
          <TextField label={t('feedback:message')} multiline rows={4} fullWidth value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <FormControlLabel
            control={<Checkbox checked={responseWanted} onChange={(ev) => setResponseWanted(ev.target.checked)} />}
            label={t('feedback:responseWanted')}
          />
        </DialogContent>
        <DialogActions>
          <OutlineButtonBlack onClick={() => setModalOpen(false)}>{t('feedback:cancel')}</OutlineButtonBlack>
          <BlueButton onClick={handleSubmit}>{t('feedback:submit')}</BlueButton>
        </DialogActions>
      </Dialog>
    </>
  )
}
