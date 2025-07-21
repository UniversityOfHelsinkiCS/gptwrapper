import { Modal, Box, IconButton, Typography, FormGroup } from '@mui/material'
import { Close } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { BlueButton } from './generics/Buttons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const DisclaimerModal = ({
  disclaimer,
  disclaimerStatus,
  setDisclaimerStatus,
}: {
  disclaimer: string
  disclaimerStatus: { open: boolean }
  setDisclaimerStatus: (status: { open: boolean }) => void
}) => {
  const { t } = useTranslation()

  return (
    <Modal open={disclaimerStatus.open} onClose={() => setDisclaimerStatus({ open: false })}>
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
        <IconButton
          id="close-disclaimer"
          onClick={() => setDisclaimerStatus({ open: false })}
          sx={{ position: 'absolute', top: 10, right: 20, color: 'grey.500' }}
        >
          <Close />
        </IconButton>

        <ReactMarkdown remarkPlugins={[remarkGfm]}>{disclaimer}</ReactMarkdown>

        <FormGroup>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BlueButton onClick={() => setDisclaimerStatus({ open: false })} type="submit">
              OK
            </BlueButton>
          </Box>
        </FormGroup>
      </Box>
    </Modal>
  )
}
