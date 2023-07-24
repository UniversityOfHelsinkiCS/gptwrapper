import React from 'react'
import { Box, Typography } from '@mui/material'

import useAccessGroups from '../../hooks/useAccessGroups'
import CreateAccessGroup from './CreateAccessGroup'

const Admin = () => {
  const { accessGroups, isLoading } = useAccessGroups()

  const validModels = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4']

  if (isLoading) return null

  return (
    <Box
    sx={{ margin: '0 auto', width: '90%', padding: '5%' }}
  >
    <Typography mb={2} variant="h3">Admin</Typography>

    <CreateAccessGroup validModels={validModels} />

    <Typography>Access groups:</Typography>
    {accessGroups.map((accessGroup) => (
      <Typography key={accessGroup.id}>{accessGroup.iamGroup}</Typography>
    ))}
  </Box>
  )
}

export default Admin
