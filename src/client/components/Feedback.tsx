import { Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Link, TextField } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'
import apiClient from '../util/apiClient'
import { addJustInTimeFields, useAnalytics } from '../stores/analytics'
import type { FeedbackPost } from '../../shared/feedback'
import { enqueueSnackbar } from './common/Snackbar'
import { useFormError } from './common/accessibility/FormError'
import { BlueButton, OutlineButtonBlack } from './ChatV2/general/Buttons'
import { supportEmail } from '@config'
import { focusIndicatorStyle } from '../util/accessibility'

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

export const Feedback: React.FC<{
  open: boolean
  onClose: () => void
}> = ({ open, onClose }) => {
  const { t } = useTranslation()
  const [feedback, setFeedback] = useState('')
  const [responseWanted, setResponseWanted] = useState(false)
  const [error, setError] = useFormError()
  const feedbackInputRef = useRef<HTMLTextAreaElement>(null)

  const submitFeedback = useSubmitFeedbackMutation()

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    if (!feedback.trim()) {
      flushSync(() => setError(t('feedback:empty'), { announce: false }))
      feedbackInputRef.current?.focus()
      return
    }
    try {
      await submitFeedback.mutateAsync({ feedback, responseWanted })
      setFeedback('')
      setResponseWanted(false)
      handleClose()
      enqueueSnackbar(t('feedback:success'), { variant: 'success' })
    } catch (e) {
      console.error('Error submitting feedback:', e)
      setError(t('feedback:error'))
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('feedback:title')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{t('feedback:description')}</DialogContentText>
        <TextField
          label={t('feedback:message')}
          multiline
          rows={4}
          fullWidth
          required
          inputRef={feedbackInputRef}
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value)

            if (error === t('feedback:empty')) setError(null)
          }}
          error={!!error}
          helperText={error}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={responseWanted}
              disableRipple
              onChange={(ev) => setResponseWanted(ev.target.checked)}
              sx={{
                ...focusIndicatorStyle(),
              }}
            />
          }
          label={t('feedback:responseWanted')}
        />
        <DialogContentText>
          <Trans
            i18nKey="feedback:supportInfo"
            values={{ supportEmail }}
            components={{
              mailTo: (
                <Link
                  href={`mailto:${supportEmail}`}
                  underline="always"
                  sx={[{ color: 'warning.main' }, (theme) => theme.applyStyles('dark', { color: '#ffa36b' })]}
                />
              ),
            }}
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <OutlineButtonBlack onClick={handleClose}>{t('feedback:cancel')}</OutlineButtonBlack>
        <BlueButton onClick={handleSubmit} disabled={submitFeedback.isPending}>
          {t('feedback:submit')}
        </BlueButton>
      </DialogActions>
    </Dialog>
  )
}
