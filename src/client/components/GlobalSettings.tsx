import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { SendPreferenceConfiguratorButton } from './Settings/SendPreferenceConfigurator'
import { Close } from '@mui/icons-material'
import { NewConversationConfirmConfigurator } from './Settings/NewConversationConfirmConfigurator'

export const GlobalSettings = ({
  open, setOpen
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('globalSettings:title')}
          <IconButton
            data-testid="close-global-settings"
            onClick={() => setOpen(false)}
            sx={{
              color: 'grey.500',
              background: '#FFF',
              opacity: 0.9,
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <SendPreferenceConfiguratorButton />
        <Box marginTop={2} />
        <NewConversationConfirmConfigurator context='settings' />
      </DialogContent>
    </Dialog>
  )
}
