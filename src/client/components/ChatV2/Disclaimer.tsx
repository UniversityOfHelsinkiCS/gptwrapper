import { Modal, Box, IconButton, Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { Close } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { BlueButton } from './general/Buttons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, useEffect } from 'react'
import { useAcceptTermsMutation } from '../../hooks/useAcceptTermsMutation'
import useCurrentUser from '../../hooks/useCurrentUser'

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
      // I think we can just close the disclaimer regardless of server response. No harm can be done really.
      setDisclaimerStatus(false)
      await acceptTermsMutation.mutateAsync()
    }
  }

  const closeAccepted = () => {
    if (termsAccepted) {
      setDisclaimerStatus(false)
    }
  }

  return (
    <Modal open={disclaimerStatus} onClose={() => closeAccepted()}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '95vw', sm: '85vw' },
          maxWidth: { xs: '95vw', sm: 1000 },
          minHeight: '25vh',
          maxHeight: { xs: '90vh', sm: '90vh' },
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: '0.3rem',
          overflow: 'auto',
          padding: '2rem',
        }}
      >
        <IconButton
          id="close-disclaimer"
          onClick={() => closeAccepted()}
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            color: 'grey.500',
            background: '#FFF',
            opacity: 0.9,
            zIndex: 1,
            display: termsAccepted ? '' : 'none',
          }}
        >
          <Close />
        </IconButton>

        <ReactMarkdown remarkPlugins={[remarkGfm]}>{disclaimer}</ReactMarkdown>
        <form onSubmit={handleSubmit}>
          <FormGroup sx={{ mt: 2 }}>
            <FormControlLabel
              disabled={termsAccepted}
              sx={{ display: termsAccepted ? 'none' : '' }}
              control={<Checkbox required checked={hasRead} onChange={handleToggle} data-testid="accept-disclaimer" />}
              label={t('info:acceptDisclaimer')}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <BlueButton disabled={!(hasRead || termsAccepted) || acceptTermsMutation.isPending} type="submit" data-testid="submit-accept-disclaimer">
                OK
              </BlueButton>
            </Box>
          </FormGroup>
        </form>
      </Box>
    </Modal>
  )
}
