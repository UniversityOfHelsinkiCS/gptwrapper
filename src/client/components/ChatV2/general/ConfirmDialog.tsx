import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useTranslation } from 'react-i18next'

const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} variant="text">
          {t('common:cancel')}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" data-testid="confirm-dialog-confirm">
          {t('common:delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog
