import { Dialog, DialogTitle, DialogContent } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { SendPreferenceConfiguratorButton } from './ChatV2/SendPreferenceConfigurator'

export const GlobalSettings = ({
  open, setOpen
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>{t('globalSettings:title')}</DialogTitle>
      <DialogContent>
        <SendPreferenceConfiguratorButton />
      </DialogContent>
    </Dialog>
  )
}
