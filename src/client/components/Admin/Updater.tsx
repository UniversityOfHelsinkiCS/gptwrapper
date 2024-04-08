import React from 'react'
import { Box, Button } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { PUBLIC_URL } from '../../../config'

const Updater = () => {
  const startUpdater = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Are you sure you want to start the updater?')) return

    const res = await fetch(`${PUBLIC_URL}/api/admin/run-updater`, {
      method: 'POST',
    })

    const resText = await res.text()

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
