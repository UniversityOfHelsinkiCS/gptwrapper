import { Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useResetAllUsageMutation } from '../../../hooks/useResetUsageMutation'
import { enqueueSnackbar } from '../../common/Snackbar'

const ResetAllUsageButton = () => {
  const { t } = useTranslation()
  const resetAllUsage = useResetAllUsageMutation()

  const handleClick = () => {
    if (!window.confirm(t('admin:resetAllUsageConfirm'))) return

    resetAllUsage.mutate(undefined, {
      onSuccess: ({ users }) => enqueueSnackbar(t('admin:resetAllUsageDone', { users }), { variant: 'success' }),
      onError: (err: Error) => enqueueSnackbar(err.message, { variant: 'error' }),
    })
  }

  return (
    <Button color="error" variant="outlined" onClick={handleClick} disabled={resetAllUsage.isPending}>
      {t('admin:resetAllUsage')}
    </Button>
  )
}

export default ResetAllUsageButton
