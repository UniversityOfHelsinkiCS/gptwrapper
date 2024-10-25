import { Box, Button } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import { updaterApiClient } from '../../util/apiClient'

const Updater = () => {
  const { t } = useTranslation()
  const startUpdater = async () => {
    if (!window.confirm('Are you sure you want to start the updater?')) return

    const res = await updaterApiClient.post(`/admin/run-updater`)

    const resText = res.data

    enqueueSnackbar(resText, { variant: 'info' })
  }

  return (
    <Box>
      <Button variant="contained" onClick={startUpdater}>
        {t('admin:startUpdater')}
      </Button>
    </Box>
  )
}

export default Updater
