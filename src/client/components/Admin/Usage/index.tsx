import React from 'react'
import { Box } from '@mui/material'
import { Navigate } from 'react-router-dom'

import useCurrentUser from '../../../hooks/useCurrentUser'
import UsageTable from './UsageTable'

const Usage = () => {
  const { user, isLoading } = useCurrentUser()

  if (isLoading) return null
  if (!user?.isAdmin) return <Navigate to="/" />

  return (
    <Box>
      <UsageTable />
    </Box>
  )
}

export default Usage
