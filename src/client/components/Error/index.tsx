import React from 'react'
import { useRouteError } from 'react-router-dom'
import { Box, Typography } from '@mui/material'

const Error = () => {
  const error: any = useRouteError()
  console.error(error)

  return (
    <Box>
      <Typography>Something went wrong</Typography>
      <Typography>
        <i>{error.statusText || error.message}</i>
      </Typography>
    </Box>
  )
}

export default Error
