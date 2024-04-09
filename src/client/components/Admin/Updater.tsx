import React from 'react'
import { Box, Button } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import apiClient from '../../util/apiClient'

const Updater = () => {
  const startUpdater = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to start the updater?')) return

    const res = await apiClient.post(`/admin/run-updater`)

    const resText = res.data

    enqueueSnackbar(resText, { variant: 'info' })
  }

  return (
    <Box>
      <Button variant="contained" onClick={startUpdater}>
        Start updater
      </Button>
    </Box>
  )
}

export default Updater
