import { Box } from '@mui/material'
import { Navigate } from 'react-router-dom'

import useCurrentUser from '../../../hooks/useCurrentUser'
import ResetAllUsageButton from './ResetAllUsageButton'
import UsageComparisonTable from './UsageComparisonTable'

const Usage = () => {
  const { user, isLoading } = useCurrentUser()

  if (isLoading) return null
  if (!user?.isAdmin) return <Navigate to="/" />

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 2 }}>
        <ResetAllUsageButton />
      </Box>
      <UsageComparisonTable />
    </Box>
  )
}

export default Usage
