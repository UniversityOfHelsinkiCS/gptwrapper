import { Modal, Box, IconButton, Typography, Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { Close } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { BlueButton } from './generics/Buttons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, useEffect } from 'react'
import { useAcceptTermsMutation } from '../../hooks/useAcceptTermsMutation'
import useCurrentUser from '../../hooks/useCurrentUser'
import { ApplicationError } from '../../../server/util/ApplicationError'
export const DisclaimerModal = ({
  disclaimer,
  disclaimerStatus,
  setDisclaimerStatus,
}: {
  disclaimer: string
  disclaimerStatus: boolean
  setDisclaimerStatus: (status: boolean) => void
}) => {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const acceptTermsMutation = useAcceptTermsMutation()
  const termsAccepted = Boolean(user?.termsAcceptedAt)
  const [hasRead, setHasRead] = useState(false)

  useEffect(() => {
    if (user) {
      setHasRead(termsAccepted)
    }
  }, [user, termsAccepted])

  const handleToggle = () => {
    setHasRead(!hasRead)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasRead) {
      try {
        await acceptTermsMutation.mutateAsync()
        setDisclaimerStatus(false)
      } catch (error) {
        console.error('Failed to accept terms:', error)
        throw ApplicationError.InternalServerError('Failed to accept terms')
      }
    }
  }

  return (
    <Modal open={disclaimerStatus} onClose={() => setDisclaimerStatus(false)}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 600,
          width: '85vw',
          maxWidth: 1000,
          height: 'fit-content',
          maxHeight: '100vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: '0.3rem',
          overflow: 'auto',
          padding: '3rem',
        }}
      >
        <IconButton id="close-disclaimer" onClick={() => setDisclaimerStatus(false)} sx={{ position: 'absolute', top: 10, right: 20, color: 'grey.500' }}>
          <Close />
        </IconButton>

        <ReactMarkdown remarkPlugins={[remarkGfm]}>{disclaimer}</ReactMarkdown>
        <form onSubmit={handleSubmit}>
          <FormGroup sx={{ mt: 2 }}>
            <FormControlLabel
              disabled={termsAccepted}
              sx={{ display: termsAccepted ? 'none' : '' }}
              control={<Checkbox required checked={hasRead} onChange={handleToggle} />}
              label={t('info:acceptDisclaimer')}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <BlueButton disabled={!(hasRead || termsAccepted) || acceptTermsMutation.isPending} type="submit">
                OK
              </BlueButton>
            </Box>
          </FormGroup>
        </form>
      </Box>
    </Modal>
  )
}
